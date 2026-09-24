import 'server-only';
import type { ConvexHttpClient } from 'convex/browser';
import type { Id } from '@convex/_generated/dataModel';
import { BACKEND_ROUTES } from '@/lib/routes';
import { chunkRagText } from '@convex/rag/chunk';
import { buildExtractiveAnswer } from '@convex/rag/answer';
import { embedWithProvider, type EmbeddingSelection } from './embedding-provider';
import { generateWithProvider } from './generate';
import type { IceAskResponse, IceIndexResponse, IceQueryResponse } from './types';
import type { IceChatProvider, IceExternalChatProvider } from './providers';

export async function savedKey(client: ConvexHttpClient, workspaceId: string, provider: IceExternalChatProvider): Promise<string> {
  const key = await client.query(BACKEND_ROUTES.iceKeys.keyForWorker, { workspaceId: workspaceId as Id<'workspaces'>, provider });
  if (!key) throw new Error(`Save your ${provider} API key in AI settings first`);
  return key;
}

type EmbeddingConfig = EmbeddingSelection & { retained: { namespace: string; provider: EmbeddingSelection['provider']; model: string }[] };

async function selectedEmbedding(client: ConvexHttpClient, workspaceId: string) {
  const config: EmbeddingConfig = await client.query(BACKEND_ROUTES.iceIndex.config, { workspaceId: workspaceId as Id<'workspaces'> });
  const key = config.provider === 'local' ? undefined : await savedKey(client, workspaceId, config.provider);
  return { config, key };
}

type ConversationHistory = { role: 'user' | 'assistant'; text: string }[];
type SourceSyncPage = { seeded: number; isDone: boolean; continueCursor: string; alreadySynced: boolean };
type ClaimedSource = { documentId: Id<'iceDocuments'>; claim: string; sourceType: string; sourceId: string; title: string; text: string; anchor: string };

/** Keep one index request comfortably inside proxy/request timeouts. */
const INDEX_TIME_BUDGET_MS = 45_000;
const CLAIM_BATCH = 16;

export async function personalQuery(client: ConvexHttpClient, input: { workspaceId: string; question: string; topK?: number }, history: ConversationHistory = []): Promise<IceQueryResponse> {
  const { config, key } = await selectedEmbedding(client, input.workspaceId);
  const recent = history.slice(-4).map(message => `${message.role}: ${message.text.slice(0, 500)}`).join('\n');
  const searchText = recent ? `Recent conversation:\n${recent}\n\nCurrent question: ${input.question}` : input.question;
  // The current namespace plus retained ones; embed the question once per model.
  const spaces = [{ namespace: config.namespace, provider: config.provider, model: config.model }, ...config.retained];
  const vectors = new Map<string, number[]>();
  const searches: { namespace: string; vector: number[] }[] = [];
  for (const space of spaces) {
    const modelKey = `${space.provider}:${space.model}`;
    let vector = vectors.get(modelKey);
    if (!vector) {
      try {
        const spaceKey = space.provider === config.provider ? key : space.provider === 'local' ? undefined : await savedKey(client, input.workspaceId, space.provider);
        [vector] = await embedWithProvider({ ...config, provider: space.provider, model: space.model, namespace: space.namespace }, [searchText], 'query', spaceKey);
      } catch (error) {
        // A retained space whose provider key was removed is skipped, never the current one.
        if (space.namespace === config.namespace) throw error;
        continue;
      }
      vectors.set(modelKey, vector);
    }
    searches.push({ namespace: space.namespace, vector });
  }
  return await client.action(BACKEND_ROUTES.iceIndex.retrieve, { workspaceId: input.workspaceId as Id<'workspaces'>, text: input.question, searches, topK: input.topK });
}

export async function personalAsk(client: ConvexHttpClient, input: { workspaceId: string; question: string; topK?: number; provider: IceChatProvider; byokModel?: string; byokKey?: string }, history: ConversationHistory = []): Promise<IceAskResponse> {
  const retrieval = await personalQuery(client, input, history);
  const prefs = await client.query(BACKEND_ROUTES.icePreferences.get, { workspaceId: input.workspaceId as Id<'workspaces'> });
  const request = { question: input.question, context: retrieval.results, history, ownerInstructions: prefs?.systemPrompt || undefined };
  if (input.provider === 'local' || retrieval.empty) return { ...retrieval, ...buildExtractiveAnswer(request), provider: input.provider };
  if (!input.byokModel) throw new Error('Select a chat model first');
  const key = await savedKey(client, input.workspaceId, input.provider);
  const generated = await generateWithProvider({ provider: input.provider, model: input.byokModel, apiKey: key }, request);
  return { ...retrieval, ...generated, provider: input.provider };
}

export async function personalIndex(client: ConvexHttpClient, workspaceId: string, options: { retryFailed?: boolean } = {}): Promise<IceIndexResponse> {
  const started = Date.now();
  const { config, key } = await selectedEmbedding(client, workspaceId);
  await client.mutation(BACKEND_ROUTES.iceIndex.beginIndex, {
    workspaceId: workspaceId as Id<'workspaces'>,
    retryFailed: options.retryFailed,
  });
  const result: IceIndexResponse = { processed: 0, indexed: 0, skipped: 0, failed: 0, pendingLeft: 0, errors: [] };
  const sourceTypes = ['task', 'taskComment', 'project', 'projectUpdate', 'event'] as const;
  let alreadySynced = false;
  for (const sourceType of sourceTypes) {
    let cursor: string | null = null;
    do {
      const page: SourceSyncPage = await client.mutation(BACKEND_ROUTES.iceIndex.syncSources, {
        workspaceId: workspaceId as Id<'workspaces'>,
        sourceType,
        paginationOpts: { numItems: 100, cursor },
      });
      alreadySynced = page.alreadySynced;
      cursor = page.isDone ? null : page.continueCursor;
    } while (cursor);
    if (alreadySynced) break;
  }
  if (!alreadySynced) {
    await client.mutation(BACKEND_ROUTES.iceIndex.finishSourceSync, {
      workspaceId: workspaceId as Id<'workspaces'>,
    });
  }
  while (Date.now() - started < INDEX_TIME_BUDGET_MS) {
    const claimed: ClaimedSource[] = await client.mutation(BACKEND_ROUTES.iceIndex.claimBatch, { workspaceId: workspaceId as Id<'workspaces'>, namespace: config.namespace, max: CLAIM_BATCH });
    if (!claimed.length) break;
    result.processed += claimed.length;
    const fail = async (source: ClaimedSource, error: unknown) => {
      const message = error instanceof Error ? error.message.slice(0, 300) : 'Indexing failed';
      result.failed++;
      result.errors.push({ sourceType: source.sourceType, sourceId: source.sourceId, error: message });
      await client.mutation(BACKEND_ROUTES.iceIndex.failed, { workspaceId: workspaceId as Id<'workspaces'>, documentId: source.documentId, claim: source.claim, error: message });
    };
    // Chunk every claimed source, then embed all their chunks in one call.
    const prepared: { source: ClaimedSource; texts: string[] }[] = [];
    for (const source of claimed) {
      try {
        if (source.text.length > 100_000) throw new Error('Source exceeds indexing budget');
        const texts = chunkRagText(source.text).map(draft => draft.text);
        if (texts.length > 200) throw new Error('Source has too many chunks');
        prepared.push({ source, texts });
      } catch (error) {
        await fail(source, error);
      }
    }
    let vectors: number[][];
    try {
      vectors = await embedWithProvider(config, prepared.flatMap(item => item.texts), 'document', key);
    } catch (error) {
      for (const item of prepared) await fail(item.source, error);
      continue;
    }
    let offset = 0;
    for (const { source, texts } of prepared) {
      const own = vectors.slice(offset, offset + texts.length);
      offset += texts.length;
      try {
        await client.mutation(BACKEND_ROUTES.iceIndex.write, {
          workspaceId: workspaceId as Id<'workspaces'>, namespace: config.namespace, documentId: source.documentId, claim: source.claim,
          chunks: texts.map((text, index) => ({ text, title: source.title, anchor: source.anchor, embedding: own[index] })),
        });
        result.indexed++;
      } catch (error) {
        await fail(source, error);
      }
    }
  }
  const status = await client.query(BACKEND_ROUTES.iceIndex.status, { workspaceId: workspaceId as Id<'workspaces'> });
  result.pendingLeft = status.pendingCount;
  return result;
}
