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
  updatedAt: string | null;
  recentErrors: IceStatusError[];
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

/** Fire-and-forget index trigger after product mutations. Never throws —
 * indexing is best-effort here; status and sweep cover the rest. */
export function triggerIceIndex(workspaceId: string): void {
  void postIce({ action: 'index', workspaceId }).catch(() => undefined);
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

export function useIceIndexing() {
  const { activeWorkspaceId } = useWorkspaces();
  const [indexResult, setIndexResult] = useState<IceIndexResponse | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);

  const runIndex = useCallback(async () => {
    if (!activeWorkspaceId) throw new Error('No active workspace');
    setIsIndexing(true);
    try {
      const result = (await postIce({
        action: 'index',
        workspaceId: activeWorkspaceId,
      })) as IceIndexResponse;
      setIndexResult(result);
      return result;
    } finally {
      setIsIndexing(false);
    }
  }, [activeWorkspaceId]);

  const requestDocs = usePendingMutation(
    useConvexMutation(BACKEND_ROUTES.rag.requestIndex),
  );
  const indexDocs = useCallback(async () => {
    if (!activeWorkspaceId) throw new Error('No active workspace');
    const { ICE_DOCS_ALLOWLIST, docsSourceId } = await import('@/lib/rag/docs');
    for (const filename of ICE_DOCS_ALLOWLIST) {
      await requestDocs.mutateAsync({
        workspaceId: activeWorkspaceId as Id<'workspaces'>,
        sourceType: 'docs',
        sourceId: docsSourceId(filename),
      });
    }
    return runIndex();
  }, [activeWorkspaceId, requestDocs, runIndex]);

  const reindex = usePendingMutation(useConvexMutation(BACKEND_ROUTES.iceIndex.reindex));
  const reindexAll = useCallback(async () => {
    if (!activeWorkspaceId) throw new Error('No active workspace');
    await reindex.mutateAsync({ workspaceId: activeWorkspaceId as Id<'workspaces'> });
    return runIndex();
  }, [activeWorkspaceId, reindex, runIndex]);

  return {
    indexResult,
    isIndexing,
    isDocsPending: requestDocs.isPending,
    runIndex,
    indexDocs,
    reindexAll,
    isReindexPending: reindex.isPending,
  };
}
