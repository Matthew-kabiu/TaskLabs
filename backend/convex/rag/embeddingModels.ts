/** Shared model metadata only. Safe for browser imports: no Convex runtime. */
export type EmbeddingProviderName = 'local' | 'openai' | 'gemini' | 'openrouter';

// Convex vector indexes use a fixed dimension. Zero padding preserves cosine
// similarity without truncating provider output. Different model spaces remain
// isolated by namespace, and query dimensions must match indexed dimensions.
export const EMBEDDING_INDEX_DIMENSIONS = 4096;
export function indexVector(vector: number[]): number[] {
  if (!vector.length || vector.length > EMBEDDING_INDEX_DIMENSIONS || vector.some(n => !Number.isFinite(n))) throw new Error('Embedding dimensions must be between 1 and 4096');
  return vector.concat(Array<number>(EMBEDDING_INDEX_DIMENSIONS - vector.length).fill(0));
}
