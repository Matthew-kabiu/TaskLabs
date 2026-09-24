/**
 * Ice RAG — deterministic chunking and identity helpers.
 *
 * Pure functions only (no Convex imports) so they stay unit-testable and
 * importable from the Next.js runtime without pulling the Convex server.
 */

export const RAG_CHUNK_TARGET = 1200;
export const RAG_CHUNK_OVERLAP = 200;
export const RAG_MAX_CHUNKS_PER_SOURCE = 200;
export const RAG_MAX_SOURCE_CHARS = 500_000;

export function normalizeRagText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Deterministic 32-bit DJB2 hex digest. Stable across runtimes; used for
 * content versions and idempotency, not for security. */
export function ragContentHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** Idempotency key for one index version of one source. */
export function ragDocumentKey(
  workspaceId: string,
  sourceType: string,
  sourceId: string,
  contentVersion: string,
  embeddingVersion: string,
): string {
  return [workspaceId, sourceType, sourceId, contentVersion, embeddingVersion].join(":");
}

/** Stable chunk identity: same source + same content + same model = same IDs. */
export function stableChunkId(documentKey: string, ordinal: number): string {
  return `${documentKey}:${ordinal}`;
}

export type RagChunkDraft = {
  ordinal: number;
  text: string;
  textHash: string;
};

/**
 * Paragraph-aware chunking: accumulate paragraphs up to the target size, then
 * start a new chunk carrying `overlap` trailing characters as context.
 * Deterministic — same input always yields the same chunks.
 */
export function chunkRagText(
  input: string,
  target = RAG_CHUNK_TARGET,
  overlap = RAG_CHUNK_OVERLAP,
  maxChunks = RAG_MAX_CHUNKS_PER_SOURCE,
): RagChunkDraft[] {
  const text = normalizeRagText(input);
  if (text.length < 1) return [];
  const paragraphs = text.split(/\n{2,}/);
  const chunks: RagChunkDraft[] = [];
  let current = "";
  const push = (body: string) => {
    if (chunks.length >= maxChunks) return;
    const trimmed = body.trim();
    if (trimmed.length < 1) return;
    chunks.push({
      ordinal: chunks.length,
      text: trimmed,
      textHash: ragContentHash(trimmed),
    });
  };
  for (const paragraph of paragraphs) {
    const candidate = current.length < 1 ? paragraph : `${current}\n\n${paragraph}`;
    if (candidate.length <= target || current.length < 1) {
      current = candidate;
      continue;
    }
    push(current);
    current = `${current.slice(-overlap)}\n\n${paragraph}`;
  }
  push(current);
  return chunks;
}
