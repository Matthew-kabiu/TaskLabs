'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Brain,
  Loader2,
  Search,
  SendHorizontal,
  Snowflake,
  Eraser,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarkdownContent } from '@/components/markdown/markdown-content';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { IceSettings } from '@/components/ice/ice-settings';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { useIce, useIceConversation, useIceIndexing, useIcePreferences, useIceProviderKeys, useIceStatus } from '@/hooks/useIce';
import { ICE_LOCAL_CHAT_MODEL, type IceChatProvider, type IceExternalChatProvider } from '@/lib/rag/providers';
import type { IceCitation } from '@/lib/rag/types';

function targetHref(target: IceCitation['target']): string {
  switch (target.page) {
    case 'task':
      return ROUTES.app.task(target.id);
    case 'project':
      return ROUTES.app.project(target.id);
    case 'event':
      return `${ROUTES.app.calendar}?event=${encodeURIComponent(target.id)}`;
    case 'tasks':
      return ROUTES.app.tasks;
    case 'docs':
      return ROUTES.app.docs.index;
  }
}

type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | {
      id: string;
      role: 'ice';
      question: string;
      answer: string | null;
      citations: IceCitation[];
      empty: boolean;
      error: string | null;
      welcome?: boolean;
    };

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

/** Streams text in small steps while it is being revealed (the typing phase).
 * Renders instantly for reduced-motion users. */
function useTypewriter(text: string | null, speedMs = 12): string {
  const reducedMotion = prefersReducedMotion();
  const [typing, setTyping] = useState({ source: text, shown: reducedMotion ? (text ?? '') : '' });
  useEffect(() => {
    if (text === null || reducedMotion || text.length < 1) return;
    let count = 0;
    const timer = window.setInterval(() => {
      count += 4;
      setTyping({ source: text, shown: text.slice(0, count) });
      if (count >= text.length) window.clearInterval(timer);
    }, speedMs);
    return () => window.clearInterval(timer);
  }, [reducedMotion, speedMs, text]);
  if (text === null) return '';
  if (reducedMotion) return text;
  return typing.source === text ? typing.shown : '';
}

function ThinkingBubble() {
  return (
    <div className="flex items-start gap-2" aria-label="Ice is thinking" role="status">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Brain className="size-3.5" />
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-muted-foreground">Ice</span>
        <span className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Thinking
          <span className="flex gap-0.5" aria-hidden="true">
            <span className="size-1 animate-pulse rounded-full bg-current" />
            <span
              className="size-1 animate-pulse rounded-full bg-current"
              style={{ animationDelay: '200ms' }}
            />
            <span
              className="size-1 animate-pulse rounded-full bg-current"
              style={{ animationDelay: '400ms' }}
            />
          </span>
        </span>
      </div>
    </div>
  );
}

function IceMessage({
  message,
  onFeedback,
}: {
  message: Extract<ChatMessage, { role: 'ice' }>;
  onFeedback: (question: string, rating: 'up' | 'down') => void;
}) {
  const welcomeText = useTypewriter(message.welcome ? message.answer : null);
  const streamed = message.welcome ? welcomeText : message.answer ?? '';
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Snowflake className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">Ice</span>
        {message.error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {message.error}
          </p>
        ) : (
          <>
            {message.answer !== null && (
              <div className="min-w-0 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm leading-relaxed">
                <MarkdownContent className="[overflow-wrap:anywhere]">{streamed}</MarkdownContent>
                {streamed.length < message.answer.length && (
                  <span className="ml-0.5 inline-block size-1.5 animate-pulse rounded-full bg-muted-foreground align-middle" />
                )}
              </div>
            )}
            {message.empty && (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Nothing in this workspace matches. Try different wording or check the knowledge
                index in AI settings.
              </p>
            )}
            {message.citations.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {message.citations.map((citation) => (
                  <li
                    key={`${citation.sourceType}:${citation.sourceId}:${citation.anchor}`}
                  >
                    <Link
                      href={targetHref(citation.target)}
                      className={cn(
                        'flex flex-col gap-0.5 rounded-md border border-border px-2.5 py-1.5',
                        'hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-[13px] font-medium">
                        {citation.title}
                        <Badge variant="secondary" className="font-mono text-[11px]">
                          {citation.anchor}
                        </Badge>
                      </span>
                      <span className="text-[13px] text-muted-foreground">{citation.snippet}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {!message.empty && !message.welcome && (
              <div className="flex items-center gap-0.5 text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label="Good answer"
                      onClick={() => onFeedback(message.question, 'up')}
                    >
                      <ThumbsUp className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Good answer</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label="Bad answer"
                      onClick={() => onFeedback(message.question, 'down')}
                    >
                      <ThumbsDown className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bad answer</TooltipContent>
                </Tooltip>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function IcePanel({ onClose }: { onClose: () => void }) {
  const { submitFeedback } = useIce();
  const conversation = useIceConversation();
  const { status } = useIceStatus();
  const { keysStatus } = useIceProviderKeys();
  const { prefs, savePreferences, activeWorkspaceId, isSavingPreferences } = useIcePreferences();
  const { runIndex } = useIceIndexing();
  const messages: ChatMessage[] = [
    {
      id: 'welcome',
      role: 'ice',
      question: '',
      answer:
        "Hi, I'm Ice. Ask me about your tasks, comments, projects, events, or product docs. I'll answer from this workspace and include the sources I used.",
      citations: [],
      empty: false,
      error: null,
      welcome: true,
    },
  ];
  for (const turn of [...conversation.turns].reverse()) {
    messages.push({ id: `${turn._id}:user`, role: 'user', text: turn.question });
    if (turn.status !== 'pending') messages.push({
      id: `${turn._id}:ice`, role: 'ice', question: turn.question,
      answer: turn.answer ?? null, citations: turn.citations, empty: turn.empty, error: turn.error ?? null,
    });
  }
  const pending = conversation.isSubmitting || conversation.turns.some(turn => turn.status === 'pending');
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<'ask' | 'retrieve'>('ask');
  const [chatSelection, setChatSelection] = useState<{ scope: string | null; provider: IceChatProvider; model: string }>({ scope: null, provider: 'local', model: ICE_LOCAL_CHAT_MODEL });
  const [apiKeyDraft, setApiKeyDraft] = useState<{ scope: string | null; value: string }>({ scope: null, value: '' });
  const autoIndexed = useRef(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const preferenceScope = prefs === undefined || !activeWorkspaceId ? null : activeWorkspaceId;
  const restoredSelection = prefs === null || prefs === undefined
    ? { provider: 'local' as const, model: ICE_LOCAL_CHAT_MODEL }
    : { provider: prefs.chatProvider, model: prefs.chatModel };
  const currentSelection = chatSelection.scope === preferenceScope ? chatSelection : { scope: preferenceScope, ...restoredSelection };
  const chatProvider = currentSelection.provider;
  const chatModel = currentSelection.model;
  const apiKey = apiKeyDraft.scope === preferenceScope ? apiKeyDraft.value : '';

  const saveModel = async () => {
    try {
      await savePreferences(chatProvider, chatModel);
      toast.success('Chat model saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save Ice preferences');
    }
  };

  useEffect(() => {
    if (!autoIndexed.current && status && (status.pendingCount > 0 || status.completeCount === 0)) {
      autoIndexed.current = true;
      void runIndex()
        .then((result) => {
          if (result.failed > 0) {
            toast.error(
              `Index run: ${result.failed} failed${result.errors[0] ? ` — ${result.errors[0].error}` : ''}`,
            );
          }
        })
        .catch(() => undefined);
    }
  }, [status, runIndex]);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [conversation.turns, pending]);

  const feedback = (askQuestion: string, rating: 'up' | 'down') => {
    void submitFeedback(askQuestion, rating)
      .then(() => toast.success('Feedback recorded'))
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'Feedback failed'),
      );
  };

  const submit = async () => {
    const trimmed = question.trim();
    if (!trimmed || pending || conversation.loading || conversation.isClearing) return;
    const draftKey = apiKey.trim();
    const hasSavedKey =
      chatProvider === 'local' ||
      (keysStatus?.[chatProvider as IceExternalChatProvider]?.configured === true);
    if (mode === 'ask' && chatProvider !== 'local' && !hasSavedKey && !draftKey) {
      toast.error('Save an API key in AI settings before using this provider');
      return;
    }
    if (mode === 'ask' && chatProvider !== 'local' && !hasSavedKey && draftKey) {
      toast.error('Press Save in AI settings first, then ask');
      return;
    }
    if (mode === 'ask' && chatProvider !== 'local' && !chatModel) {
      toast.error('Load and select a model in AI settings');
      return;
    }
    setQuestion('');
    try { await conversation.send(trimmed, mode, chatProvider, chatModel); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not send message'); }
  };

  const clearMemory = async () => {
    try {
      await conversation.clearMemory();
      setQuestion('');
      setClearDialogOpen(false);
      toast.success('Conversation memory cleared');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not clear memory'); }
  };

  return (
    <TooltipProvider>
      <section className="flex h-full min-h-0 flex-col" aria-label="Ice chat">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <IceSettings
            key={activeWorkspaceId ?? 'loading'}
            preferencesLoading={prefs === undefined}
            isSavingModel={isSavingPreferences}
            onSaveModel={saveModel}
            chatProvider={chatProvider}
            chatModel={chatModel}
            apiKey={apiKey}
            onChatProviderChange={(provider, model) => {
              setChatSelection({ scope: preferenceScope, provider, model });
              setApiKeyDraft({ scope: preferenceScope, value: '' });
            }}
            onChatModelChange={model => setChatSelection({ scope: preferenceScope, provider: chatProvider, model })}
            onApiKeyChange={value => setApiKeyDraft({ scope: preferenceScope, value })}
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Ice</h2>
            <p className="truncate text-xs text-muted-foreground">Workspace assistant</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto size-8"
                aria-label="Close Ice chat"
                onClick={onClose}
              >
                <X className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close Ice</TooltipContent>
          </Tooltip>
        </header>
        <div
          ref={threadRef}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
        >
          {conversation.loading && <p role="status" className="text-xs text-muted-foreground">Loading conversation…</p>}
          {(conversation.canLoadMore || conversation.loadingMore) && <Button variant="ghost" size="sm" disabled={conversation.loadingMore} onClick={conversation.loadMore}>{conversation.loadingMore ? 'Loading…' : 'Load earlier messages'}</Button>}
          {!conversation.loading && messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className="flex items-start justify-end gap-2">
                <div className="flex max-w-[85%] flex-col items-end gap-1">
                  <span className="text-[11px] font-medium text-muted-foreground">You</span>
                  <p className="whitespace-pre-wrap rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                    {message.text}
                  </p>
                </div>
                <span className="mt-5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                  <User className="size-3.5" />
                </span>
              </div>
            ) : (
              <IceMessage
                key={message.id}
                message={message}
                onFeedback={(askQuestion, rating) => feedback(askQuestion, rating)}
              />
            ),
          )}
          {pending && <ThinkingBubble />}
        </div>
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void submit();
              }}
              placeholder="Message Ice…"
              aria-label="Message Ice"
              maxLength={2000}
            />
            <div className="flex rounded-md border border-input" role="group" aria-label="Conversation actions">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setClearDialogOpen(true)}
                    disabled={conversation.loading || conversation.isClearing || !conversation.turns.length}
                    aria-label="Clear memory"
                  >
                    <Eraser className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear memory</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={mode === 'retrieve' ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setMode(value => value === 'retrieve' ? 'ask' : 'retrieve')}
                    aria-label="Retrieve mode"
                    aria-pressed={mode === 'retrieve'}
                  >
                    <Search className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Retrieve sources only</TooltipContent>
              </Tooltip>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={submit}
                  disabled={pending || conversation.loading || conversation.isClearing || question.trim().length < 1}
                  aria-label="Send message"
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <SendHorizontal className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </section>
      <Dialog open={clearDialogOpen} onOpenChange={open => { if (!conversation.isClearing) setClearDialogOpen(open); }}>
        <DialogContent className="max-w-md gap-5 sm:rounded-md">
          <DialogHeader>
            <DialogTitle>Clear conversation memory?</DialogTitle>
            <DialogDescription>This deletes your saved messages, answers, and conversation context in this workspace. Indexed sources, API keys, and model settings are kept. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={conversation.isClearing} onClick={() => setClearDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={conversation.isClearing} onClick={() => void clearMemory()}>
              {conversation.isClearing ? <Loader2 className="size-4 animate-spin" /> : <Eraser className="size-4" />}
              {conversation.isClearing ? 'Clearing…' : 'Clear memory'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
