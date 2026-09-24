/**
 * Ice RAG — local extractive generation (pure, deterministic).
 *
 * No LLM call: selects the highest-scoring distinct sources, quotes a bounded
 * snippet from each, and states the grounding explicitly. Used by the default
 * local provider (browser UI + MCP `rag.ask`) so answers are always
 * citation-complete with zero model spend or data egress.
 */

import type { GenerationRequest, GenerationResult, RagCitation } from "./providers";

const MAX_CITED_SOURCES = 3;
const SNIPPET_CHARS = 280;

export function snippetFor(text: string, maxChars = SNIPPET_CHARS): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxChars) return collapsed;
  return `${collapsed.slice(0, maxChars).trimEnd()}…`;
}

export function citationFor(
  chunk: GenerationRequest["context"][number],
): RagCitation {
  return {
    sourceType: chunk.sourceType,
    sourceId: chunk.sourceId,
    anchor: chunk.anchor,
    title: chunk.title,
    snippet: snippetFor(chunk.text),
    target: chunk.target,
  };
}

export function buildExtractiveAnswer(request: GenerationRequest): GenerationResult {
  const seen = new Set<string>();
  const citations: RagCitation[] = [];
  for (const chunk of request.context) {
    const key = `${chunk.sourceType}:${chunk.sourceId}:${chunk.anchor}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push(citationFor(chunk));
    if (citations.length >= MAX_CITED_SOURCES) break;
  }
  if (citations.length < 1) {
    return {
      answer:
        "I found nothing in this workspace that answers the question. No model was called.",
      citations,
    };
  }
  const lines = citations.map(
    (citation, index) =>
      `${index + 1}. ${citation.title} [${citation.anchor}]: ${citation.snippet}`,
  );
  return {
    answer: `Grounded in ${citations.length} workspace source${citations.length === 1 ? "" : "s"} (local extractive answer, no external model):\n${lines.join("\n")}`,
    citations,
  };
}
