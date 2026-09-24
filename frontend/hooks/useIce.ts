'use client';

import { useCallback, useState } from 'react';
import { useMutation as useConvexMutation, useQuery, usePaginatedQuery } from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { usePendingMutation } from '@/hooks/usePendingMutation';
import { BACKEND_ROUTES } from '@/lib/routes';
import type {
  IceAskResponse,
  IceIndexResponse,
  IceModelsResponse,
  IceQueryResponse,
} from '@/lib/rag/types';
import type { IceChatProvider, IceExternalChatProvider } from '@/lib/rag/providers';

export type IceStatusError = {
  sourceType: string;
  sourceId: string;
  error: string;
};

export type IceStatus = {
  indexVersion: number;
  embeddingModel: string;
  embeddingVersion: string;
  pendingCount: number;
  completeCount: number;
  failedCount: number;
  chunkCount: number;
  /** True when more pending sources exist than the status scan counts. */
  pendingCapped: boolean;
  /** Earlier index versions still searched alongside the current one. */
  retainedCount: number;
  updatedAt: number | null;
  recentErrors: IceStatusError[];
  /** Why the last index run stopped early, e.g. a rate limit or missing key. */
  lastRunError: string | null;
  lastRunAt: number | null;
};

type IceState =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'error'; message: string };

async function postIce(body: unknown): Promise<unknown> {
  const response = await fetch('/api/ice', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : 'Ice request failed';
    throw new Error(message);
  }
  return payload;
}

export function useIceConversation() {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = activeWorkspaceId as Id<'workspaces'> | undefined;
  const conversation = useQuery(BACKEND_ROUTES.iceConversation.get, workspaceId ? { workspaceId } : 'skip');
  const messages = usePaginatedQuery(BACKEND_ROUTES.iceConversation.list,
    workspaceId && conversation ? { workspaceId, generation: conversation.generation } : 'skip',
    { initialNumItems: 30 });
  const clearMutation = useConvexMutation(BACKEND_ROUTES.iceConversation.clear);
  const [submitting, setSubmitting] = useState<{ workspaceId: string; generation: number; requestId: string } | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const send = async (question: string, mode: 'ask' | 'retrieve', provider: IceChatProvider, model: string) => {
    if (!workspaceId || !conversation) throw new Error('Conversation is still loading');
    const requestId = crypto.randomUUID();
    setSubmitting({ workspaceId, generation: conversation.generation, requestId });
    try {
      await postIce({ action: mode === 'ask' ? 'ask' : 'query', workspaceId, generation: conversation.generation,
        requestId, question, provider, byokModel: model });
    } finally { setSubmitting(current => current?.requestId === requestId ? null : current); }
  };
  const clearMemory = async () => {
    if (!workspaceId || !conversation) throw new Error('Conversation is still loading');
    setIsClearing(true);
    try { await clearMutation({ workspaceId, generation: conversation.generation }); }
    finally { setIsClearing(false); }
  };
  return { turns: messages.results, loading: !conversation || messages.status === 'LoadingFirstPage',
    loadMore: () => messages.loadMore(30), canLoadMore: messages.status === 'CanLoadMore',
    loadingMore: messages.status === 'LoadingMore', isSubmitting: Boolean(submitting && submitting.workspaceId === workspaceId && submitting.generation === conversation?.generation),
    isClearing, send, clearMemory };
}

const TRIGGER_DEBOUNCE_MS = 3000;
const pendingTriggers = new Map<string, ReturnType<typeof setTimeout>>();

/** Index trigger after product mutations, debounced per workspace so a burst
 * of edits costs one run. Never throws here: the server records run errors
 * and the Ice status shows them. */
export function triggerIceIndex(workspaceId: string): void {
  clearTimeout(pendingTriggers.get(workspaceId));
  pendingTriggers.set(workspaceId, setTimeout(() => {
    pendingTriggers.delete(workspaceId);
    void postIce({ action: 'index', workspaceId }).catch(() => undefined);
  }, TRIGGER_DEBOUNCE_MS));
}

export function useIceStatus() {
  const { activeWorkspaceId } = useWorkspaces();
  const data = useQuery(
    BACKEND_ROUTES.iceIndex.status,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId as Id<'workspaces'> } : 'skip',
  ) as IceStatus | undefined;
  return {
    status: data,
    isLoading: Boolean(activeWorkspaceId) && data === undefined,
  };
}

export function useIce() {
  const { activeWorkspaceId } = useWorkspaces();
  const [state, setState] = useState<IceState>({ kind: 'idle' });
  const [lastQuery, setLastQuery] = useState<IceQueryResponse | null>(null);
  const [lastAsk, setLastAsk] = useState<IceAskResponse | null>(null);

  const runQuery = useCallback(
    async (question: string, generation: number, topK?: number) => {
      if (!activeWorkspaceId) throw new Error('No active workspace');
      setState({ kind: 'working' });
      try {
        const result = (await postIce({
          action: 'query',
          generation,
          requestId: crypto.randomUUID(),
          workspaceId: activeWorkspaceId,
          question,
          topK,
        })) as IceQueryResponse;
        setLastQuery(result);
        setLastAsk(null);
        setState({ kind: 'idle' });
        return result;
      } catch (error) {
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Ice query failed',
        });
        throw error;
      }
    },
    [activeWorkspaceId],
  );

  const runAsk = useCallback(
    async (
      question: string,
      provider: IceChatProvider,
      generation: number,
      byok?: { model: string; key?: string },
      topK?: number,
    ) => {
      if (!activeWorkspaceId) throw new Error('No active workspace');
      setState({ kind: 'working' });
      try {
        const result = (await postIce({
          action: 'ask',
          generation,
          requestId: crypto.randomUUID(),
          workspaceId: activeWorkspaceId,
          question,
          topK,
          provider,
          byokModel: byok?.model,
          ...(byok?.key?.trim() ? { byokKey: byok.key.trim() } : {}),
        })) as IceAskResponse;
        setLastAsk(result);
        setLastQuery(null);
        setState({ kind: 'idle' });
        return result;
      } catch (error) {
        setState({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Ice ask failed',
        });
        throw error;
      }
    },
    [activeWorkspaceId],
  );

  const sendFeedback = usePendingMutation(
    useConvexMutation(BACKEND_ROUTES.rag.feedback),
  );
  const submitFeedback = useCallback(
    async (question: string, rating: 'up' | 'down') => {
      if (!activeWorkspaceId) throw new Error('No active workspace');
      await sendFeedback.mutateAsync({
        workspaceId: activeWorkspaceId as Id<'workspaces'>,
        question,
        rating,
      });
    },
    [activeWorkspaceId, sendFeedback],
  );

  return {
    state,
    isWorking: state.kind === 'working',
    error: state.kind === 'error' ? state.message : null,
    lastQuery,
    lastAsk,
    runQuery,
    runAsk,
    submitFeedback,
    isFeedbackPending: sendFeedback.isPending,
  };
}

export type IceKeyStatusEntry = {
  configured: boolean;
  suffix: string | null;
  updatedAt: number | null;
};

export type IceKeysStatus = Record<IceExternalChatProvider, IceKeyStatusEntry>;

export function useIceProviderKeys() {
  const { activeWorkspaceId } = useWorkspaces();
  const status = useQuery(
    BACKEND_ROUTES.iceKeys.status,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId as Id<'workspaces'> } : 'skip',
  ) as unknown as IceKeysStatus | undefined;
  const save = usePendingMutation(useConvexMutation(BACKEND_ROUTES.iceKeys.saveKey));
  const clear = usePendingMutation(useConvexMutation(BACKEND_ROUTES.iceKeys.clearKey));

  const saveKey = useCallback(
    async (provider: IceExternalChatProvider, key: string) => {
      if (!activeWorkspaceId) throw new Error('No active workspace');
      await save.mutateAsync({
        workspaceId: activeWorkspaceId as Id<'workspaces'>,
        provider,
        key,
      });
    },
    [activeWorkspaceId, save],
  );

  const clearKey = useCallback(
    async (provider: IceExternalChatProvider) => {
      if (!activeWorkspaceId) throw new Error('No active workspace');
      await clear.mutateAsync({
        workspaceId: activeWorkspaceId as Id<'workspaces'>,
        provider,
      });
    },
    [activeWorkspaceId, clear],
  );

  return {
    keysStatus: status ?? null,
    isKeysLoading: Boolean(activeWorkspaceId) && status === undefined,
    saveKey,
    clearKey,
    isSavingKey: save.isPending,
    isClearingKey: clear.isPending,
  };
}

export type IcePreferences = {
  chatProvider: IceChatProvider;
  chatModel: string;
  systemPrompt: string;
  updatedAt: number;
  embedding: { provider: import('@/lib/rag/providers').IceEmbeddingProvider; model: string; revision: number; namespace: string };
} | null;

export function useIcePreferences() {
  const { activeWorkspaceId } = useWorkspaces();
  const prefs = useQuery(
    BACKEND_ROUTES.icePreferences.get,
    activeWorkspaceId ? { workspaceId: activeWorkspaceId as Id<'workspaces'> } : 'skip',
  ) as unknown as IcePreferences | undefined;
  const saveMutation = usePendingMutation(useConvexMutation(BACKEND_ROUTES.icePreferences.save));
  const promptMutation = usePendingMutation(useConvexMutation(BACKEND_ROUTES.icePreferences.saveSystemPrompt));

  const saveSystemPrompt = useCallback(
    async (prompt: string) => {
      if (!activeWorkspaceId) throw new Error('No active workspace');
      await promptMutation.mutateAsync({ workspaceId: activeWorkspaceId as Id<'workspaces'>, prompt });
    },
    [activeWorkspaceId, promptMutation],
  );

  const savePreferences = useCallback(
    async (chatProvider: IceChatProvider, chatModel: string) => {
      if (!activeWorkspaceId) throw new Error('No active workspace');
      await saveMutation.mutateAsync({
        workspaceId: activeWorkspaceId as Id<'workspaces'>,
        chatProvider,
        chatModel,
      });
    },
    [activeWorkspaceId, saveMutation],
  );

  return {
    activeWorkspaceId,
    prefs,
    isPrefsLoading: Boolean(activeWorkspaceId) && prefs === undefined,
    savePreferences,
    isSavingPreferences: saveMutation.isPending,
    saveSystemPrompt,
    isSavingSystemPrompt: promptMutation.isPending,
  };
}

export function useIceModels() {
  const { activeWorkspaceId } = useWorkspaces();
  const [isLoading, setIsLoading] = useState(false);

  const loadModels = useCallback(
    async (provider: IceExternalChatProvider, key?: string) => {
      if (!activeWorkspaceId) throw new Error('No active workspace');
      setIsLoading(true);
      try {
        return (await postIce({
          action: 'models',
          workspaceId: activeWorkspaceId,
          provider,
          ...(key?.trim() ? { byokKey: key.trim() } : {}),
        })) as IceModelsResponse;
      } finally {
        setIsLoading(false);
      }
    },
    [activeWorkspaceId],
  );

  return { loadModels, isLoading };
}

const MAX_INDEX_REQUESTS = 50;

export function useIceIndexing() {
  const { activeWorkspaceId } = useWorkspaces();
  const [indexResult, setIndexResult] = useState<IceIndexResponse | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);

  const runIndex = useCallback(async (options: { retryFailed?: boolean } = {}) => {
    if (!activeWorkspaceId) throw new Error('No active workspace');
    setIsIndexing(true);
    const result: IceIndexResponse = {
      processed: 0,
      indexed: 0,
      skipped: 0,
      failed: 0,
      pendingLeft: 0,
      errors: [],
    };
    try {
      // Each request indexes for a bounded time; keep going until the queue
      // is empty or a request makes no progress.
      for (let request = 0; request < MAX_INDEX_REQUESTS; request++) {
        const current = (await postIce({
          action: 'index',
          workspaceId: activeWorkspaceId,
          ...(request === 0 && options.retryFailed ? { retryFailed: true } : {}),
        })) as IceIndexResponse;
        result.processed += current.processed;
        result.indexed += current.indexed;
        result.skipped += current.skipped;
        result.failed += current.failed;
        result.pendingLeft = current.pendingLeft;
        result.errors.push(...current.errors);
        if (current.pendingLeft === 0 || current.processed === 0) break;
      }
      return result;
    } finally {
      // Partial progress stays visible even when a request throws.
      setIndexResult(result);
      setIsIndexing(false);
    }
  }, [activeWorkspaceId]);

  const reindex = usePendingMutation(useConvexMutation(BACKEND_ROUTES.iceIndex.reindex));
  const reindexAll = useCallback(async () => {
    if (!activeWorkspaceId) throw new Error('No active workspace');
    await reindex.mutateAsync({ workspaceId: activeWorkspaceId as Id<'workspaces'> });
    return runIndex();
  }, [activeWorkspaceId, reindex, runIndex]);

  return {
    indexResult,
    isIndexing,
    runIndex,
    reindexAll,
    isReindexPending: reindex.isPending,
  };
}
