/**
 * Hosted embedding providers (OpenAI, Gemini, OpenRouter) over fetch.
 * Runtime-neutral: used by the Next.js index worker and by Convex actions
 * (MCP search), so provider keys used over MCP never leave the backend.
 */

export type RemoteEmbeddingProvider = 'openai' | 'gemini' | 'openrouter';

const BATCH_SIZE = 32;
const CONCURRENCY = 4;
const TIMEOUT_MS = 60_000;

function normalizedVectors(value: unknown, count: number): number[][] {
  if (!Array.isArray(value) || value.length !== count) throw new Error('Embedding provider returned an incomplete batch');
  return value.map((row: unknown) => {
    if (!Array.isArray(row) || !row.length || row.length > 4096 || row.some(n => typeof n !== 'number' || !Number.isFinite(n))) throw new Error('This embedding model must return between 1 and 4096 finite dimensions');
    const norm = Math.hypot(...(row as number[]));
    if (!norm) throw new Error('Embedding provider returned a zero vector');
    return (row as number[]).map(n => n / norm);
  });
}

export async function embedRemote(provider: RemoteEmbeddingProvider, model: string, inputs: string[], purpose: 'query' | 'document', key: string): Promise<number[][]> {
  if (!inputs.length) return [];
  const gemini = provider === 'gemini';
  const url = gemini ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:batchEmbedContents` : provider === 'openai' ? 'https://api.openai.com/v1/embeddings' : 'https://openrouter.ai/api/v1/embeddings';
  const embedBatch = async (batch: string[]) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST', cache: 'no-store', signal: controller.signal,
        headers: { 'content-type': 'application/json', ...(gemini ? { 'x-goog-api-key': key } : { authorization: `Bearer ${key}` }) },
        body: JSON.stringify(gemini ? { requests: batch.map(text => ({ model: `models/${model}`, content: { parts: [{ text }] }, taskType: purpose === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT' })) } : { model, input: batch, encoding_format: 'float' }),
      });
      if (!response.ok) {
        const detail = (await response.text().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 200);
        throw new Error(`${provider} embeddings failed (${response.status})${detail ? `: ${detail}` : ''}`);
      }
      const payload = await response.json() as { embeddings?: { values: number[] }[]; data?: { index: number; embedding: number[] }[] };
      const raw = gemini ? payload.embeddings?.map(item => item.values) : payload.data?.sort((a, b) => a.index - b.index).map(item => item.embedding);
      return normalizedVectors(raw, batch.length);
    } finally {
      clearTimeout(timer);
    }
  };
  const batches: string[][] = [];
  for (let start = 0; start < inputs.length; start += BATCH_SIZE) batches.push(inputs.slice(start, start + BATCH_SIZE));
  const output: number[][][] = new Array(batches.length);
  // A few batches in flight at once; results keep input order.
  let next = 0;
  const run = async () => {
    while (next < batches.length) {
      const index = next++;
      output[index] = await embedBatch(batches[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, run));
  return output.flat();
}
