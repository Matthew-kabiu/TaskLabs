/**
 * Ice RAG — local embedding runtime (SERVER ONLY, never import client-side).
 *
 * MiniLM-class embeddings run in the Next.js route layer because Convex
 * functions cannot load native ONNX modules. Model identity, version, and
 * dimensions are the backend canonical constants — a single source of truth.
 */

import {
  RAG_EMBEDDING_DIMENSIONS,
  RAG_EMBEDDING_MODEL,
  RAG_MODEL_CACHE_DIR,
} from '@convex/rag/providers';

export { RAG_EMBEDDING_DIMENSIONS, RAG_EMBEDDING_MODEL };

type FeatureExtractor = (
  inputs: string[],
  options?: { pooling?: string; normalize?: boolean },
) => Promise<{ tolist(): number[][] }>;

let extractorPromise: Promise<FeatureExtractor> | null = null;
let unavailableReason: string | null = null;

export function embeddingReadiness(): { ready: boolean; reason: string | null } {
  return { ready: extractorPromise !== null && unavailableReason === null, reason: unavailableReason };
}

async function loadExtractor(): Promise<FeatureExtractor> {
  if (typeof window !== 'undefined') {
    throw new Error('Local embeddings run server-side only');
  }
  if (!extractorPromise) {
    extractorPromise = (async () => {
      try {
        const { pipeline, env } = await import('@huggingface/transformers');
        env.cacheDir = RAG_MODEL_CACHE_DIR;
        const extractor = (await pipeline(
          'feature-extraction',
          RAG_EMBEDDING_MODEL,
          { dtype: 'q4' },
        )) as unknown as FeatureExtractor;
        unavailableReason = null;
        return extractor;
      } catch (error) {
        extractorPromise = null;
        unavailableReason =
          error instanceof Error ? error.message : 'Embedding model failed to load';
        throw new Error(
          `Local embedding model unavailable: ${unavailableReason}. ` +
            'Retrieval is disabled until the model loads (first start downloads weights).',
        );
      }
    })();
  }
  return extractorPromise;
}

/** Embed one batch of texts. Throws with a recoverable message when the
 * model is not ready — callers report status, never a partial index. */
export async function embedTexts(inputs: string[]): Promise<number[][]> {
  if (inputs.length < 1) return [];
  const extractor = await loadExtractor();
  const output = await extractor(inputs, { pooling: 'mean', normalize: true });
  const vectors = output.tolist();
  for (const vector of vectors) {
    if (vector.length !== RAG_EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding dimension mismatch: expected ${RAG_EMBEDDING_DIMENSIONS}, got ${vector.length}`,
      );
    }
  }
  return vectors;
}
