import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ConvexHttpClient } from 'convex/browser';
import type { Id } from '@convex/_generated/dataModel';
import { BACKEND_ROUTES } from '@/lib/routes';
import { chunkRagText } from '@convex/rag/chunk';
import { buildExtractiveAnswer } from '@convex/rag/answer';
import { ICE_DOCS_ALLOWLIST, docsChunkAnchor, docsTitle } from './docs';
import { embedWithProvider, type EmbeddingSelection } from './embedding-provider';
import { generateWithProvider } from './generate';
import type { IceAskResponse, IceIndexResponse, IceQueryResponse } from './types';
import type { IceChatProvider, IceExternalChatProvider } from './providers';

export async function savedKey(client: ConvexHttpClient, workspaceId: string, provider: IceExternalChatProvider): Promise<string> {
  const key = await client.query(BACKEND_ROUTES.iceKeys.keyForWorker, { workspaceId: workspaceId as Id<'workspaces'>, provider });
  if (!key) throw new Error(`Save your ${provider} API key in AI settings first`);
  return key;
}

async function selectedEmbedding(client: ConvexHttpClient, workspaceId: string) {
  const config: EmbeddingSelection = await client.query(BACKEND_ROUTES.iceIndex.config, { workspaceId: workspaceId as Id<'workspaces'> });
  const key = config.provider === 'local' ? undefined : await savedKey(client, workspaceId, config.provider);
  return { config, key };
}

type ConversationHistory = { role: 'user' | 'assistant'; text: string }[];
type SourceSyncPage = { seeded: number; isDone: boolean; continueCursor: string; alreadySynced: boolean };

export async function personalQuery(client: ConvexHttpClient, input: { workspaceId: string; question: string; topK?: number }, history: ConversationHistory = []): Promise<IceQueryResponse> {
  const { config, key } = await selectedEmbedding(client, input.workspaceId);
  const recent = history.slice(-4).map(message => `${message.role}: ${message.text.slice(0, 500)}`).join('\n');
  const searchText = recent ? `Recent conversation:\n${recent}\n\nCurrent question: ${input.question}` : input.question;
  const [vector] = await embedWithProvider(config, [searchText], 'query', key);
  return await client.action(BACKEND_ROUTES.iceIndex.retrieve, { workspaceId: input.workspaceId as Id<'workspaces'>, namespace: config.namespace, vector, topK: input.topK });
}

export async function personalAsk(client: ConvexHttpClient, input: { workspaceId: string; question: string; topK?: number; provider: IceChatProvider; byokModel?: string; byokKey?: string }, history: ConversationHistory = []): Promise<IceAskResponse> {
  const retrieval = await personalQuery(client, input, history);
  const request = { question: input.question, context: retrieval.results, history };
  if (input.provider === 'local' || retrieval.empty) return { ...retrieval, ...buildExtractiveAnswer(request), provider: input.provider };
  if (!input.byokModel) throw new Error('Select a chat model first');
  const key = await savedKey(client, input.workspaceId, input.provider);
  const generated = await generateWithProvider({ provider: input.provider, model: input.byokModel, apiKey: key }, request);
  return { ...retrieval, ...generated, provider: input.provider };
}

export async function personalIndex(client: ConvexHttpClient, workspaceId: string): Promise<IceIndexResponse> {
  const { config, key } = await selectedEmbedding(client, workspaceId);
  await client.mutation(BACKEND_ROUTES.iceIndex.beginIndex, {
    workspaceId: workspaceId as Id<'workspaces'>,
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
  for (let i = 0; i < 10; i++) {
    const claimed = await client.mutation(BACKEND_ROUTES.iceIndex.claim, { workspaceId: workspaceId as Id<'workspaces'>, namespace: config.namespace });
    if (!claimed) break;
    result.processed++;
    try {
      let text = claimed.text;
      let filename = '';
      if (claimed.sourceType === 'docs') {
        filename = claimed.sourceId.slice('docs:'.length);
        if (!(ICE_DOCS_ALLOWLIST as readonly string[]).includes(filename)) throw new Error('Docs source is not allowlisted');
        text = await readFile(join(process.cwd(), '..', 'docs', 'docs', filename), 'utf8');
      }
      if (text.length > 100_000) throw new Error('Source exceeds indexing budget');
      const drafts = chunkRagText(text);
      if (drafts.length > 200) throw new Error('Source has too many chunks');
      const vectors = await embedWithProvider(config, drafts.map(draft => draft.text), 'document', key);
      await client.mutation(BACKEND_ROUTES.iceIndex.write, {
        workspaceId: workspaceId as Id<'workspaces'>, namespace: config.namespace, documentId: claimed.documentId, claim: claimed.claim,
        chunks: drafts.map((draft, index) => ({ text: draft.text, title: filename ? docsTitle(filename) : claimed.title, anchor: filename ? docsChunkAnchor(filename, draft.text, index) : claimed.anchor, embedding: vectors[index] })),
      });
      result.indexed++;
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 300) : 'Indexing failed';
      result.failed++;
      result.errors.push({ sourceType: claimed.sourceType, sourceId: claimed.sourceId, error: message });
      await client.mutation(BACKEND_ROUTES.iceIndex.failed, { workspaceId: workspaceId as Id<'workspaces'>, documentId: claimed.documentId, claim: claimed.claim, error: message });
    }
  }
  const status = await client.query(BACKEND_ROUTES.iceIndex.status, { workspaceId: workspaceId as Id<'workspaces'> });
  result.pendingLeft = status.pendingCount;
  return result;
}
