/**
 * Ice RAG — static docs corpus (pure helpers; file reads live in the route).
 *
 * Product docs are versioned with the repo, so the content hash doubles as
 * the index version: identical bytes are never re-embedded.
 */

export const ICE_DOCS_ALLOWLIST = [
  'DESIGN.md',
  'API_KEYS_AND_MCP.md',
  'Backend-Build-Template-Convex.md',
  'TASKLABS_spec.md',
] as const;

export function docsSourceId(filename: string): string {
  return `docs:${filename}`;
}

/** Stable anchor: first markdown heading inside the chunk, else part index. */
export function docsChunkAnchor(filename: string, chunkText: string, ordinal: number): string {
  const heading = chunkText
    .split('\n')
    .map((line) => line.trim())
    .find((line) => /^#{1,4} /.test(line));
  const slug = heading
    ? heading
        .replace(/^#{1,4} /, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
    : `part-${ordinal}`;
  return `docs:${filename}#${slug || `part-${ordinal}`}`;
}

export function docsTitle(filename: string): string {
  return `Docs: ${filename}`;
}
