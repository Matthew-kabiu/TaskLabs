import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IcePanel } from '@/components/ice/ice-panel';

const { conversationSend } = vi.hoisted(() => ({ conversationSend: vi.fn() }));

vi.mock('@/hooks/useIce', async (importOriginal) => {
  const React = await import('react');
  const actual = await importOriginal<typeof import('@/hooks/useIce')>();
  return {
    ...actual,
    useIce: () => ({
      state: { kind: 'idle' },
      isWorking: false,
      error: null,
      lastQuery: null,
      lastAsk: null,
      runQuery: vi.fn(),
      submitFeedback: vi.fn().mockResolvedValue(undefined),
      isFeedbackPending: false,
    }),
    useIceConversation: () => {
      const [turns, setTurns] = React.useState<Array<{
        _id: string;
        question: string;
        status: 'pending' | 'complete';
        answer?: string;
        citations: Array<{ sourceType: 'task'; sourceId: string; anchor: string; title: string; snippet: string; target: { page: 'task'; id: string } }>;
        empty: boolean;
        error?: string;
      }>>([]);
      return {
        turns,
        loading: false,
        loadMore: vi.fn(),
        canLoadMore: false,
        loadingMore: false,
        isSubmitting: turns.some(turn => turn.status === 'pending'),
        isClearing: false,
        clearMemory: vi.fn(),
        send: async (question: string) => {
          conversationSend(question);
          setTurns([{ _id: 'turn-1', question, status: 'pending', citations: [], empty: false }]);
          await Promise.resolve();
          setTurns([{
            _id: 'turn-1',
            question,
            status: 'complete',
            answer: 'Grounded in 1 workspace source.',
            citations: [{ sourceType: 'task', sourceId: 't1', anchor: 'task#3', title: 'Deploy', snippet: 'snippet', target: { page: 'task', id: 't1' } }],
            empty: false,
          }]);
        },
      };
    },
    useIceStatus: () => ({
      status: {
        indexVersion: 2,
        embeddingModel: 'local/minilm',
        embeddingVersion: 'v1',
        pendingCount: 0,
        completeCount: 4,
        failedCount: 0,
        chunkCount: 9,
        updatedAt: null,
        recentErrors: [],
      },
      isLoading: false,
    }),
    useIceIndexing: () => ({
      indexResult: null,
      isIndexing: false,
      isDocsPending: false,
      runIndex: vi.fn(),
      indexDocs: vi.fn(),
      reindexAll: vi.fn(),
      isReindexPending: false,
    }),
    useIceProviderKeys: () => ({
      keysStatus: null,
      isKeysLoading: false,
      saveKey: vi.fn(),
      clearKey: vi.fn(),
      isSavingKey: false,
      isClearingKey: false,
    }),
    useIcePreferences: () => ({
      activeWorkspaceId: 'w1',
      prefs: null,
      isPrefsLoading: false,
      savePreferences: vi.fn(),
      isSavingPreferences: false,
    }),
  };
});

vi.mock('@/components/ice/ice-embedding-settings', () => ({
  IceEmbeddingSettings: () => <div>Embedding settings</div>,
}));

vi.mock('@/hooks/useWorkspaces', () => ({
  useWorkspaces: () => ({ activeWorkspaceId: 'w1' }),
}));

describe('IcePanel chat', () => {
  it('sends a message and renders the ice reply with an exact-source link', async () => {
    render(<IcePanel onClose={() => undefined} />);
    const input = screen.getByLabelText('Message Ice');
    fireEvent.change(input, { target: { value: 'What is blocked?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(screen.getByText('What is blocked?')).toBeDefined();
    expect(screen.getByLabelText('Ice is thinking')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/Grounded in 1 workspace source/)).toBeDefined();
    });
    const link = screen.getByRole('link', { name: /Deploy/ });
    expect(link.getAttribute('href')).toBe('/tasks?task=t1');
    expect(screen.getByRole('button', { name: /Good answer/ })).toBeDefined();
    expect(conversationSend).toHaveBeenCalledOnce();
  });

  it('shows persistent index errors from status', () => {
    render(<IcePanel onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open AI settings' }));
    expect(screen.getByText(/Ready/)).toBeDefined();
  });
});
