import 'server-only';
import { embedTexts } from './embed';
import type { EmbeddingProviderName } from '@convex/rag/embeddingModels';

export type EmbeddingSelection = { provider: EmbeddingProviderName; model: string; namespace: string; revision: number };

function vectors(value: unknown, count: number): number[][] {
  if (!Array.isArray(value) || value.length !== count) throw new Error('Embedding provider returned an incomplete batch');
  return value.map((row: unknown) => {
    if (!Array.isArray(row) || !row.length || row.length > 4096 || row.some(n => typeof n !== 'number' || !Number.isFinite(n))) throw new Error('This embedding model must return between 1 and 4096 finite dimensions');
    const norm = Math.hypot(...row);
    if (!norm) throw new Error('Embedding provider returned a zero vector');
    return row.map(n => n / norm);
  });
}

export async function embedWithProvider(config: EmbeddingSelection, inputs: string[], purpose: 'query' | 'document', key?: string): Promise<number[][]> {
  if (!inputs.length) return [];
  if (config.provider === 'local') return embedTexts(inputs);
  if (!key) throw new Error('Save your own embedding provider key first');
  const output: number[][] = [];
  for (let start = 0; start < inputs.length; start += 32) {
    const batch = inputs.slice(start, start + 32);
    const gemini = config.provider === 'gemini';
    const url = gemini ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:batchEmbedContents` : config.provider === 'openai' ? 'https://api.openai.com/v1/embeddings' : 'https://openrouter.ai/api/v1/embeddings';
    const response = await fetch(url, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(60000),
      headers: { 'content-type': 'application/json', ...(gemini ? { 'x-goog-api-key': key } : { authorization: `Bearer ${key}` }) },
      body: JSON.stringify(gemini ? { requests: batch.map(text => ({ model: `models/${config.model}`, content: { parts: [{ text }] }, taskType: purpose === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT' })) } : { model: config.model, input: batch, encoding_format: 'float' }),
    });
    if (!response.ok) throw new Error(`${config.provider} embeddings failed (${response.status})`);
    const payload = await response.json() as { embeddings?: { values: number[] }[]; data?: { index: number; embedding: number[] }[] };
    const raw = gemini ? payload.embeddings?.map(item => item.values) : payload.data?.sort((a, b) => a.index - b.index).map(item => item.embedding);
    output.push(...vectors(raw, batch.length));
  }
  return output;
}
