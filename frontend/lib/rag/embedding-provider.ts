import 'server-only';
import { embedTexts } from './embed';
import type { EmbeddingProviderName } from '@convex/rag/embeddingModels';
import { embedRemote } from '@convex/rag/remoteEmbedding';

export type EmbeddingSelection = { provider: EmbeddingProviderName; model: string; namespace: string; revision: number };

export async function embedWithProvider(config: EmbeddingSelection, inputs: string[], purpose: 'query' | 'document', key?: string): Promise<number[][]> {
  if (!inputs.length) return [];
  if (config.provider === 'local') return embedTexts(inputs);
  if (!key) throw new Error('Save your own embedding provider key first');
  return embedRemote(config.provider, config.model, inputs, purpose, key);
}
