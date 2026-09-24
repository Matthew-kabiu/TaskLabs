/**
 * Ice RAG — shared client/server response contracts for /api/ice.
 * No secrets, no content logging; ids and counts only in telemetry.
 */

export type IceSourceType = 'task' | 'taskComment' | 'project' | 'projectUpdate' | 'event' | 'docs';

export type IceLinkTarget =
  | { page: 'task'; id: string }
  | { page: 'project'; id: string }
  | { page: 'event'; id: string }
  | { page: 'tasks' }
  | { page: 'docs' };

export type IceCitation = {
  sourceType: IceSourceType;
  sourceId: string;
  anchor: string;
  title: string;
  snippet: string;
  target: IceLinkTarget;
};

export type IceResult = {
  text: string;
  score: number;
  sourceType: IceSourceType;
  sourceId: string;
  anchor: string;
  title: string;
  target: IceLinkTarget;
  via?: string;
};

export type IceQueryResponse = {
  results: IceResult[];
  indexVersion: number;
  empty: boolean;
};

export type IceAskResponse = IceQueryResponse & {
  answer: string;
  citations: IceCitation[];
  provider: 'local' | 'gemini' | 'claude' | 'openai' | 'openrouter';
};

export type IceModelOption = {
  id: string;
  label: string;
};

export type IceModelsResponse = {
  models: IceModelOption[];
};

export type IceIndexError = {
  sourceType: string;
  sourceId: string;
  error: string;
};

export type IceIndexResponse = {
  processed: number;
  indexed: number;
  skipped: number;
  failed: number;
  pendingLeft: number;
  errors: IceIndexError[];
};

export type IceErrorResponse = {
  error: string;
  rateLimited?: boolean;
  retryAfterMs?: number;
};
