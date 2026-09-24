/**
 * Ice RAG — provider contracts and selected-model constants.
 *
 * Selected (local-first): MiniLM-class embeddings run in the Next.js runtime
 * (Convex functions cannot load native ONNX modules). Every stored vector
 * carries model identity + version + dimensions; a model change forces a new
 * namespace and controlled reindex — never mix embedding spaces.
 */

export const RAG_EMBEDDING_PROVIDER = "local";
export const RAG_EMBEDDING_MODEL = "onnx-community/all-MiniLM-L6-v2-ONNX";
export const RAG_EMBEDDING_VERSION = "minilm-l6-v2-q4-1";
export const RAG_EMBEDDING_DIMENSIONS = 384;

/** Local model cache inside the container/host. Ephemeral by design: a cold
 * start re-downloads weights on first use (readiness reports unavailable
 * until then). No env var — fixed constant, documented in
 * docs/docs/AI-RAG-IMPLEMENTATION.md. */
export const RAG_MODEL_CACHE_DIR = "/tmp/ice-models";

export const RAG_RETRIEVAL_TOP_K_DEFAULT = 5;
export const RAG_RETRIEVAL_TOP_K_MAX = 20;
/** Initial cosine-similarity floor. Tuned by the offline evaluation corpus;
 * retrieval below this is reported as empty, never sent to generation. */
export const RAG_MIN_SCORE = 0.2;

export const RAG_INDEX_VERSION_SEED = 1;
export const RAG_SOURCE_SYNC_VERSION = 1;

export type RagSourceType =
  | "task"
  | "taskComment"
  | "project"
  | "projectUpdate"
  | "event"
  | "docs";

export const RAG_SOURCE_TYPES: readonly RagSourceType[] = [
  "task",
  "taskComment",
  "project",
  "projectUpdate",
  "event",
  "docs",
];

export function isRagSourceType(value: string): value is RagSourceType {
  return (RAG_SOURCE_TYPES as readonly string[]).includes(value);
}

export interface EmbeddingProvider {
  readonly provider: string;
  readonly model: string;
  readonly version: string;
  readonly dimensions: number;
  embed(inputs: string[]): Promise<number[][]>;
}

export type LinkTarget =
  | { page: "task"; id: string }
  | { page: "project"; id: string }
  | { page: "event"; id: string }
  | { page: "tasks" }
  | { page: "docs" };

export type RetrievedChunk = {
  text: string;
  score: number;
  sourceType: RagSourceType;
  sourceId: string;
  anchor: string;
  title: string;
  target: LinkTarget;
  /** Set on one-hop neighbours: the anchor of the hit that linked to this record. */
  via?: string;
};

export type RagCitation = {
  sourceType: RagSourceType;
  sourceId: string;
  anchor: string;
  title: string;
  snippet: string;
  target: LinkTarget;
};

export interface GenerationRequest {
  question: string;
  context: RetrievedChunk[];
  history?: { role: 'user' | 'assistant'; text: string }[];
  /** The user's saved Ice instructions. Shapes style and focus only. */
  ownerInstructions?: string;
}

export interface GenerationResult {
  answer: string;
  citations: RagCitation[];
}

export interface GenerationProvider {
  readonly provider: string;
  readonly model: string;
  generate(request: GenerationRequest): Promise<GenerationResult>;
}
