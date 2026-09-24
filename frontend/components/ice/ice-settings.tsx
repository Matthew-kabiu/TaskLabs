'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  FileText,
  KeyRound,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { IceEmbeddingSettings } from './ice-embedding-settings';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useIceIndexing, useIceModels, useIceProviderKeys, useIceStatus } from '@/hooks/useIce';
import {
  ICE_CHAT_PROVIDERS,
  ICE_LOCAL_CHAT_MODEL,
  type IceChatProvider,
  type IceExternalChatProvider,
} from '@/lib/rag/providers';
import type { IceIndexError, IceModelOption } from '@/lib/rag/types';

type IceSettingsProps = {
  preferencesLoading: boolean;
  isSavingModel: boolean;
  onSaveModel: () => Promise<void>;
  chatProvider: IceChatProvider;
  chatModel: string;
  apiKey: string;
  onChatProviderChange: (provider: IceChatProvider, model: string) => void;
  onChatModelChange: (model: string) => void;
  onApiKeyChange: (key: string) => void;
};

function ActionTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function IceSettings({
  preferencesLoading,
  isSavingModel,
  onSaveModel,
  chatProvider,
  chatModel,
  apiKey,
  onChatProviderChange,
  onChatModelChange,
  onApiKeyChange,
}: IceSettingsProps) {
  const { status, isLoading } = useIceStatus();
  const { loadModels, isLoading: isLoadingModels } = useIceModels();
  const {
    keysStatus,
    saveKey,
    clearKey,
    isSavingKey,
    isClearingKey,
  } = useIceProviderKeys();
  const {
    indexResult,
    isIndexing,
    isDocsPending,
    runIndex,
    indexDocs,
    reindexAll,
    isReindexPending,
  } = useIceIndexing();
  const [confirmReindex, setConfirmReindex] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [catalog, setCatalog] = useState<{
    provider: IceExternalChatProvider;
    models: IceModelOption[];
  } | null>(null);
  const [modelFilter, setModelFilter] = useState('');
  const models = catalog?.provider === chatProvider ? catalog.models : [];
  const filteredModels = (() => {
    const query = modelFilter.trim().toLowerCase();
    const base = !query
      ? models
      : models.filter(
          (model) =>
            model.label.toLowerCase().includes(query) ||
            model.id.toLowerCase().includes(query),
        );
    return base;
  })();
  const provider = ICE_CHAT_PROVIDERS[chatProvider];
  const errors: IceIndexError[] = [];

  for (const failure of indexResult?.errors ?? []) errors.push(failure);
  const seen = new Set(errors.map((failure) => `${failure.sourceType}:${failure.sourceId}`));
  for (const failure of status?.recentErrors ?? []) {
    if (!seen.has(`${failure.sourceType}:${failure.sourceId}`)) errors.push(failure);
  }

  const handleIndex = () => {
    void runIndex()
      .then((result) => {
        if (result.failed > 0) {
          toast.error(
            `Index run: ${result.failed} failed${result.errors[0] ? ` - ${result.errors[0].error}` : ''}`,
          );
        } else {
          toast.success(`Index updated (${result.indexed} sources)`);
        }
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'Index run failed'),
      );
  };

  const handleDocsIndex = () => {
    void indexDocs()
      .then((result) =>
        result.failed > 0
          ? toast.error(
              `Docs indexing: ${result.failed} failed${result.errors[0] ? ` - ${result.errors[0].error}` : ''}`,
            )
          : toast.success(`Docs indexed (${result.indexed} updated)`),
      )
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'Docs indexing failed'),
      );
  };

  const savedEntry =
    chatProvider === 'local'
      ? null
      : (keysStatus?.[chatProvider as IceExternalChatProvider] ?? null);
  const savedConfigured = savedEntry?.configured === true;

  const applyCatalog = useCallback(
    (provider: IceExternalChatProvider, models: IceModelOption[], quiet: boolean) => {
      setCatalog({ provider, models });
      setModelFilter('');
      if (models.length < 1) {
        if (!quiet) toast.error('This provider returned no generation models');
        return;
      }
      if (!models.some((model) => model.id === chatModel)) {
        onChatModelChange(models[0].id);
      }
      if (!quiet) toast.success(`Loaded ${models.length} models`);
    },
    [chatModel, onChatModelChange],
  );

  const handleLoadModels = useCallback(
    (options?: { quiet?: boolean; keyOverride?: string }) => {
      if (chatProvider === 'local') return;
      const externalProvider = chatProvider as IceExternalChatProvider;
      const quiet = options?.quiet ?? false;
      void loadModels(externalProvider, options?.keyOverride)
        .then((result) => applyCatalog(externalProvider, result.models, quiet))
        .catch((error: unknown) => {
          if (!quiet) {
            toast.error(error instanceof Error ? error.message : 'Could not load models');
          }
        });
    },
    [applyCatalog, chatProvider, loadModels],
  );

  const autoLoadedKey = useRef<string | null>(null);

  // Auto-load from the saved key as soon as the provider is configured.
  useEffect(() => {
    if (chatProvider === 'local' || !savedConfigured) return;
    const cacheKey = `saved:${chatProvider}`;
    if (autoLoadedKey.current === cacheKey) return;
    if (catalog?.provider === chatProvider && catalog.models.length > 0) {
      autoLoadedKey.current = cacheKey;
      return;
    }
    autoLoadedKey.current = cacheKey;
    handleLoadModels({ quiet: true });
  }, [catalog, chatProvider, handleLoadModels, savedConfigured]);

  // Auto-load while typing a fresh key so the catalog previews before saving.
  useEffect(() => {
    if (chatProvider === 'local') {
      autoLoadedKey.current = null;
      return;
    }
    const trimmed = apiKey.trim();
    if (!trimmed || savedConfigured) return;
    const cacheKey = `draft:${chatProvider}:${trimmed}`;
    if (autoLoadedKey.current === cacheKey) return;
    const timer = window.setTimeout(() => {
      autoLoadedKey.current = cacheKey;
      handleLoadModels({ quiet: true, keyOverride: trimmed });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [apiKey, chatProvider, handleLoadModels, savedConfigured]);

  const handleSaveKey = () => {
    if (chatProvider === 'local') return;
    const externalProvider = chatProvider as IceExternalChatProvider;
    const trimmed = apiKey.trim();
    if (!trimmed) {
      toast.error('Paste an API key before saving');
      return;
    }
    void saveKey(externalProvider, trimmed)
      .then(() => {
        autoLoadedKey.current = null;
        onApiKeyChange('');
        toast.success(`${provider.label} key saved`);
        handleLoadModels({ quiet: true });
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'Could not save key'),
      );
  };

  const handleClearKey = () => {
    if (chatProvider === 'local') return;
    const externalProvider = chatProvider as IceExternalChatProvider;
    void clearKey(externalProvider)
      .then(() => {
        autoLoadedKey.current = null;
        setCatalog(null);
        setClearDialogOpen(false);
        onChatModelChange('');
        toast.success(`${provider.label} key removed`);
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'Could not remove key'),
      );
  };
  return (
    <>
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              aria-label="Open AI settings"
            >
              <Settings2 className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">AI settings</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        side="bottom"
        className="max-h-[min(520px,calc(100vh-8rem))] w-[340px] max-w-[calc(100vw-2rem)] overflow-y-auto p-0"
      >
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">AI settings</h3>
          <p className="text-xs text-muted-foreground">Choose how Ice retrieves and answers.</p>
        </div>

        <div className="flex flex-col gap-4 p-4">
          <IceEmbeddingSettings />

          <section className="flex flex-col gap-2 border-t border-border pt-4" aria-labelledby="ice-chat-heading">
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-muted-foreground" />
              <h4 id="ice-chat-heading" className="text-sm font-medium">
                Chat model
              </h4>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ice-chat-provider" className="text-xs text-muted-foreground">
                Provider
              </Label>
              <Select
                value={chatProvider}
                disabled={preferencesLoading || isSavingModel}
                onValueChange={(value) => {
                  const next = value as IceChatProvider;
                  setCatalog(null);
                  setModelFilter('');
                  setClearDialogOpen(false);
                  onChatProviderChange(next, next === 'local' ? ICE_LOCAL_CHAT_MODEL : '');
                }}
              >
                <SelectTrigger id="ice-chat-provider" aria-label="Chat provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[24vh]">
                  {(Object.keys(ICE_CHAT_PROVIDERS) as IceChatProvider[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {ICE_CHAT_PROVIDERS[value].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{provider.description}</p>
            {chatProvider !== 'local' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ice-api-key" className="flex items-center gap-1.5 text-xs">
                  <KeyRound className="size-3.5 text-muted-foreground" />
                  API key
                  {savedConfigured && savedEntry?.suffix && (
                    <Badge variant="secondary" className="font-mono text-[11px]">
                      Saved ····{savedEntry.suffix}
                    </Badge>
                  )}
                  {savedConfigured && (
                    <ActionTooltip label="Remove saved key">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-auto size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setClearDialogOpen(true)}
                        aria-label="Remove saved key"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </ActionTooltip>
                  )}
                </Label>
                <div className="flex gap-1">
                  <PasswordInput
                    id="ice-api-key"
                    value={apiKey}
                    onChange={(event) => {
                      onApiKeyChange(event.target.value);
                    }}
                    placeholder={
                      savedConfigured ? 'Saved — paste to replace' : 'Paste provider key'
                    }
                    autoComplete="off"
                  />
                  <ActionTooltip label="Save API key">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 shrink-0"
                      onClick={handleSaveKey}
                      disabled={isSavingKey || !apiKey.trim()}
                      aria-label="Save API key"
                    >
                      {isSavingKey ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                    </Button>
                  </ActionTooltip>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Stored encrypted in this workspace and reused across sessions. Never
                  shown again after saving.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ice-chat-model" className="text-xs text-muted-foreground">
                Model
              </Label>
              {chatProvider !== 'local' && models.length > 0 && (
                <Input
                  value={modelFilter}
                  onChange={(event) => {
                    const next = event.target.value;
                    setModelFilter(next);
                    const query = next.trim().toLowerCase();
                    if (!query) return;
                    const first = models.find(
                      (model) =>
                        model.label.toLowerCase().includes(query) ||
                        model.id.toLowerCase().includes(query),
                    );
                    if (first && first.id !== chatModel) {
                      onChatModelChange(first.id);
                    }
                  }}
                  placeholder="Search models…"
                  aria-label="Search models"
                  maxLength={120}
                />
              )}
              <div className="flex gap-1">
                <Select
                  value={chatModel}
                  onValueChange={onChatModelChange}
                  disabled={preferencesLoading || isSavingModel || (chatProvider !== 'local' && models.length < 1)}
                >
                  <SelectTrigger id="ice-chat-model" aria-label="Chat model">
                    <SelectValue
                      placeholder={isLoadingModels ? 'Loading models...' : 'Load provider models'}
                    >
                      {chatProvider === 'local' ? 'Grounded answer' : models.find((model) => model.id === chatModel)?.label || chatModel || undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[24vh]">
                    {chatProvider === 'local' ? (
                      <SelectItem value={ICE_LOCAL_CHAT_MODEL}>Grounded answer</SelectItem>
                    ) : filteredModels.length > 0 ? (
                      filteredModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.label}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__no-match" disabled>
                        No models match “{modelFilter.trim()}”
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {chatProvider !== 'local' && (
                  <ActionTooltip label="Reload available models">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 shrink-0"
                      onClick={() => handleLoadModels()}
                      disabled={isLoadingModels || (!savedConfigured && !apiKey.trim())}
                      aria-label="Reload available models"
                    >
                      <RefreshCw className={isLoadingModels ? 'size-4 animate-spin' : 'size-4'} />
                    </Button>
                  </ActionTooltip>
                )}
              </div>
            </div>
          </section>

          <Button
            type="button"
            variant="outline"
            onClick={() => void onSaveModel()}
            disabled={preferencesLoading || isSavingModel || !chatModel || (chatProvider !== 'local' && !models.some((model) => model.id === chatModel))}
          >
            {isSavingModel ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isSavingModel ? 'Saving model…' : 'Save model'}
          </Button>

          <section className="flex flex-col gap-2 border-t border-border pt-4" aria-labelledby="ice-index-heading">
            <div className="flex items-center gap-2">
              <RefreshCw className="size-4 text-muted-foreground" />
              <h4 id="ice-index-heading" className="text-sm font-medium">
                Knowledge index
              </h4>
              {!isLoading && status && (
                <Badge
                  className="ml-auto"
                  variant={status.failedCount > 0 ? 'destructive' : status.pendingCount > 0 ? 'secondary' : 'default'}
                >
                  {status.failedCount > 0
                    ? `${status.failedCount} failed`
                    : status.pendingCount > 0
                      ? `${status.pendingCount} pending`
                      : 'Ready'}
                </Badge>
              )}
            </div>
            {isLoading || !status ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <p className="font-mono text-xs text-muted-foreground">
                {status.completeCount} sources · {status.chunkCount} chunks · v{status.indexVersion}
              </p>
            )}
            <div className="flex items-center gap-1">
              <ActionTooltip label="Index pending sources">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={isIndexing || isDocsPending}
                  onClick={handleIndex}
                  aria-label="Index pending sources"
                >
                  {isIndexing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                </Button>
              </ActionTooltip>
              <ActionTooltip label="Index product docs">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={isIndexing || isDocsPending}
                  onClick={handleDocsIndex}
                  aria-label="Index product docs"
                >
                  {isDocsPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                </Button>
              </ActionTooltip>
              {confirmReindex ? (
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isReindexPending || isIndexing || isDocsPending}
                    onClick={() => {
                      void reindexAll()
                        .then(() => {
                          setConfirmReindex(false);
                          toast.success('Full reindex completed');
                        })
                        .catch((error: unknown) =>
                          toast.error(error instanceof Error ? error.message : 'Reindex failed'),
                        );
                    }}
                  >
                    {isReindexPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Confirm
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmReindex(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <ActionTooltip label="Reindex all sources">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto size-8"
                    onClick={() => setConfirmReindex(true)}
                    aria-label="Reindex all sources"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </ActionTooltip>
              )}
            </div>
            {errors.length > 0 && (
              <ul className="flex max-h-24 flex-col gap-1 overflow-y-auto">
                {errors.map((failure) => (
                  <li
                    key={`${failure.sourceType}:${failure.sourceId}`}
                    role="alert"
                    className="font-mono text-xs text-destructive"
                  >
                    {failure.sourceType}:{failure.sourceId} - {failure.error}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </PopoverContent>
    </Popover>
      <Dialog open={clearDialogOpen} onOpenChange={(next) => !isClearingKey && setClearDialogOpen(next)}>
        <DialogContent className="max-w-md gap-5 sm:rounded-md">
          <DialogHeader className="gap-3">
            <div className="grid size-10 place-items-center rounded-md border border-destructive/30 bg-destructive/10 text-destructive">
              <Trash2 className="size-5" aria-hidden />
            </div>
            <div className="space-y-2">
              <DialogTitle>Remove saved {provider.label} key?</DialogTitle>
              <DialogDescription className="leading-6">
                This permanently deletes the saved key
                {savedEntry?.suffix && (
                  <>
                    {' '}(ending <strong className="font-medium text-foreground">····{savedEntry.suffix}</strong>)
                  </>
                )}{' '}
                for your account in this workspace. You will need a new key before using this provider for chat or embeddings again.
                This action cannot be undone.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              disabled={isClearingKey}
              onClick={() => setClearDialogOpen(false)}
            >
              Keep key
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isClearingKey}
              onClick={handleClearKey}
            >
              {isClearingKey ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
              {isClearingKey ? 'Removing…' : 'Remove key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
