/** Authenticated Ice worker. Embedding selection, keys and indexes belong to the caller. */
import { ConvexHttpClient } from 'convex/browser';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import type { Id } from '@convex/_generated/dataModel';
import { BACKEND_ROUTES } from '@/lib/routes';
import { personalQuery, personalAsk, personalIndex, savedKey } from '@/lib/rag/personal-worker';
import { iceRequestSchema } from '@/lib/validations/rag.schema';
import type { IceExternalChatProvider } from '@/lib/rag/providers';
import type { IceModelsResponse, IceQueryResponse, IceCitation } from '@/lib/rag/types';
import { citationFor } from '@convex/rag/answer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ProviderModelsPayload = {
  data?: { id?: string; name?: string; display_name?: string; architecture?: { output_modalities?: string[] } }[];
  nextPageToken?: string;
  models?: { name?: string; displayName?: string; supportedGenerationMethods?: string[] }[];
};

async function handleModels(client: ConvexHttpClient, input: { workspaceId: string; provider: IceExternalChatProvider; byokKey?: string; purpose: 'chat' | 'embedding' }): Promise<IceModelsResponse> {
  await client.query(BACKEND_ROUTES.iceIndex.config, { workspaceId: input.workspaceId as Id<'workspaces'> });
  const key = input.byokKey?.trim() || await savedKey(client, input.workspaceId, input.provider);
  const embeddings = input.purpose === 'embedding';
  if (embeddings && input.provider === 'claude') throw new Error('Anthropic does not offer embedding models');
  let url: string;
  let headers: HeadersInit;
  if (input.provider === 'gemini') {
    url = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000';
    headers = { 'x-goog-api-key': key };
  } else if (input.provider === 'claude') {
    url = 'https://api.anthropic.com/v1/models?limit=1000';
    headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01' };
  } else {
    url = input.provider === 'openai' ? 'https://api.openai.com/v1/models' : embeddings ? 'https://openrouter.ai/api/v1/embeddings/models' : 'https://openrouter.ai/api/v1/models';
    headers = { authorization: `Bearer ${key}` };
  }
  const response = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${input.provider} model catalog request failed (${response.status})`);
  const payload = await response.json() as ProviderModelsPayload;
  // Gemini catalogs are paginated, including their embedding-capable models.
  while (input.provider === 'gemini' && payload.nextPageToken) {
    const page = new URL(url);
    page.searchParams.set('pageToken', payload.nextPageToken);
    const next = await fetch(page, { headers, cache: 'no-store', signal: AbortSignal.timeout(30000) });
    if (!next.ok) throw new Error(`Gemini model catalog request failed (${next.status})`);
    const data = await next.json() as ProviderModelsPayload;
    payload.models = [...(payload.models ?? []), ...(data.models ?? [])];
    payload.nextPageToken = data.nextPageToken;
  }
  const models = input.provider === 'gemini'
    ? (payload.models ?? []).filter(model => model.supportedGenerationMethods?.includes(embeddings ? 'embedContent' : 'generateContent')).flatMap(model => {
        const id = model.name?.replace(/^models\//, '');
        return id ? [{ id, label: model.displayName || id }] : [];
      })
    : (payload.data ?? []).filter(model => !embeddings || input.provider !== 'openai' || model.id?.includes('embedding') || model.architecture?.output_modalities?.includes('embeddings')).flatMap(model => model.id ? [{ id: model.id, label: model.display_name || model.name || model.id }] : []);
  return { models: models.sort((a, b) => a.label.localeCompare(b.label)) };
}

export async function POST(request: Request) {
  try {
    const token = await convexAuthNextjsToken();
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = iceRequestSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: 'Invalid Ice request' }, { status: 400 });
    const url = process.env.CONVEX_SERVER_URL;
    if (!url) throw new Error('CONVEX_SERVER_URL is required');
    const client = new ConvexHttpClient(url, { skipConvexDeploymentUrlCheck: true });
    client.setAuth(token);
    if (parsed.data.action === 'query' || parsed.data.action === 'ask') {
      const input = parsed.data;
      const workspaceId = input.workspaceId as Id<'workspaces'>;
      const { turnId, history } = await client.mutation(BACKEND_ROUTES.iceConversation.begin, { workspaceId, generation: input.generation, requestId: input.requestId, question: input.question, mode: input.action === 'ask' ? 'ask' : 'retrieve' });
      try {
        let result: IceQueryResponse;
        let answer: string | undefined;
        let citations: IceCitation[];
        if (input.action === 'ask') {
          const asked = await personalAsk(client, input, history);
          result = asked;
          answer = asked.answer;
          citations = asked.citations;
        } else {
          result = await personalQuery(client, input, history);
          citations = result.results.map(citationFor);
        }
        const saved = await client.mutation(BACKEND_ROUTES.iceConversation.finish, { workspaceId, turnId, answer, citations, empty: result.empty });
        if (!saved.stored) return Response.json({ discarded: true });
        return Response.json(result);
      } catch (error) {
        const message = error instanceof Error ? error.message.slice(0, 300) : 'Ice request failed';
        const saved = await client.mutation(BACKEND_ROUTES.iceConversation.finish, { workspaceId, turnId, citations: [], empty: false, error: message });
        if (!saved.stored) return Response.json({ discarded: true });
        return Response.json({ error: message }, { status: 400 });
      }
    }
    if (parsed.data.action === 'models') return Response.json(await handleModels(client, parsed.data));
    const workspaceId = parsed.data.workspaceId as Id<'workspaces'>;
    try {
      const result = await personalIndex(client, parsed.data.workspaceId, { retryFailed: parsed.data.retryFailed });
      await client.mutation(BACKEND_ROUTES.iceIndex.recordRun, { workspaceId });
      return Response.json(result);
    } catch (error) {
      // Run-level failures (rate limit, missing key, provider down) stay visible in status.
      const message = error instanceof Error ? error.message.slice(0, 300) : 'Indexing failed';
      await client.mutation(BACKEND_ROUTES.iceIndex.recordRun, { workspaceId, error: message }).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message.slice(0, 300) : 'Ice request failed' }, { status: 400 });
  }
}
