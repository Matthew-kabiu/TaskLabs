'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Database, Loader2, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '@convex/_generated/dataModel';
import { RAG_EMBEDDING_MODEL } from '@convex/rag/providers';
import type { IceModelOption } from '@/lib/rag/types';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useIceProviderKeys } from '@/hooks/useIce';
import { BACKEND_ROUTES } from '@/lib/routes';
import { ICE_EMBEDDING_PROVIDERS, type IceEmbeddingProvider } from '@/lib/rag/providers';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function IceEmbeddingSettings() {
  const { activeWorkspaceId } = useWorkspaces();
  const config = useQuery(BACKEND_ROUTES.iceIndex.config, activeWorkspaceId ? { workspaceId: activeWorkspaceId as Id<'workspaces'> } : 'skip');
  if (!config || !activeWorkspaceId) return <p className="text-xs text-muted-foreground">Loading embedding settings…</p>;
  return <EmbeddingForm key={`${activeWorkspaceId}:${config.namespace}`} workspaceId={activeWorkspaceId as Id<'workspaces'>} initialProvider={config.provider} initialModel={config.model} />;
}

function EmbeddingForm({ workspaceId, initialProvider, initialModel }: { workspaceId: Id<'workspaces'>; initialProvider: IceEmbeddingProvider; initialModel: string }) {
  const [provider, setProvider] = useState(initialProvider);
  const [model, setModel] = useState(initialModel);
  const [draftKey, setDraftKey] = useState('');
  const [saving, setSaving] = useState(false);
  const { keysStatus, saveKey, isSavingKey } = useIceProviderKeys();
  const saveEmbedding = useMutation(BACKEND_ROUTES.icePreferences.saveEmbedding);
  const savedKey = provider === 'local' ? null : keysStatus?.[provider];
  const [catalog, setCatalog] = useState<{ requestKey: string; models: IceModelOption[] } | null>(null);
  const [catalogError, setCatalogError] = useState<{ requestKey: string; message: string } | null>(null);
  const [reload, setReload] = useState(0);
  const requestKey = `${provider}:${savedKey?.updatedAt ?? 'none'}:${reload}`;
  const models = provider === 'local' ? [{ id: RAG_EMBEDDING_MODEL, label: 'Private local · MiniLM' }] : catalog?.requestKey === requestKey ? catalog.models : [];
  const currentError = catalogError?.requestKey === requestKey ? catalogError.message : null;
  const loadingModels = provider !== 'local' && savedKey?.configured === true && catalog?.requestKey !== requestKey && catalogError?.requestKey !== requestKey;

  useEffect(() => {
    if (provider === 'local' || !savedKey?.configured) return;
    const controller = new AbortController();
    void fetch('/api/ice', {
      method: 'POST', signal: controller.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'models', purpose: 'embedding', provider, workspaceId }),
    }).then(async response => {
      const payload = await response.json() as { models?: IceModelOption[]; error?: string };
      if (!response.ok || !Array.isArray(payload.models)) throw new Error(payload.error ?? 'Could not load embedding models');
      if (controller.signal.aborted) return;
      const options = payload.models;
      setCatalog({ requestKey, models: options });
      setModel(current => options.some(option => option.id === current) ? current : options[0]?.id ?? '');
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : 'Could not load embedding models';
      setCatalogError({ requestKey, message });
      toast.error(message);
    });
    return () => controller.abort();
  }, [provider, requestKey, savedKey?.configured, workspaceId]);

  async function persistEmbedding() {
    setSaving(true);
    try {
      await saveEmbedding({ workspaceId, provider, model });
      toast.success('Embedding model saved for you. Index your sources to use this selection.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save embedding model'); }
    finally { setSaving(false); }
  }

  return (
    <section className="flex flex-col gap-2" aria-labelledby="ice-embedding-heading">
      <div className="flex items-center gap-2"><Database className="size-4 text-muted-foreground" /><h4 id="ice-embedding-heading" className="text-sm font-medium">Embedding model</h4></div>
      <Select value={provider} disabled={saving} onValueChange={value => { const next = value as IceEmbeddingProvider; setProvider(next); setModel(next === 'local' ? RAG_EMBEDDING_MODEL : ''); setDraftKey(''); }}>
        <SelectTrigger aria-label="Embedding provider"><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-[24vh]">
          {(Object.keys(ICE_EMBEDDING_PROVIDERS) as IceEmbeddingProvider[]).map(value => <SelectItem key={value} value={value}>{ICE_EMBEDDING_PROVIDERS[value].label}</SelectItem>)}
          <SelectItem value="claude" disabled>Claude — chat only</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{ICE_EMBEDDING_PROVIDERS[provider].description}</p>
      <div className="flex gap-1">
        <Select value={model} disabled={saving || loadingModels || !models.length} onValueChange={setModel}>
          <SelectTrigger aria-label="Embedding model"><SelectValue placeholder={loadingModels ? 'Loading embedding models…' : 'Save a key to load models'}>{models.find(option => option.id === model)?.label || model || undefined}</SelectValue></SelectTrigger>
          <SelectContent className="max-h-[24vh]">{models.map(option => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
        {provider !== 'local' && <Button variant="outline" size="icon" className="shrink-0" aria-label="Reload embedding models" disabled={loadingModels || !savedKey?.configured} onClick={() => setReload(value => value + 1)}><RefreshCw className={loadingModels ? 'size-4 animate-spin' : 'size-4'} /></Button>}
      </div>
      {currentError && <p role="alert" className="text-xs text-destructive">{currentError}</p>}
      {provider !== 'local' && savedKey?.configured && !loadingModels && !currentError && catalog?.requestKey === requestKey && !models.length && <p className="text-xs text-muted-foreground">This provider returned no embedding models.</p>}
      {provider !== 'local' && <>
        <Label htmlFor="ice-embedding-key" className="text-xs">Your {ICE_EMBEDDING_PROVIDERS[provider].label} key{savedKey?.configured ? ` · saved ····${savedKey.suffix}` : ''}</Label>
        <div className="flex gap-1">
          <PasswordInput id="ice-embedding-key" autoComplete="off" value={draftKey} onChange={event => setDraftKey(event.target.value)} placeholder={savedKey?.configured ? 'Paste to replace saved key' : 'Paste your provider key'} />
          <Button variant="outline" size="icon" className="shrink-0" aria-label="Save embedding API key" disabled={!draftKey.trim() || isSavingKey} onClick={() => {
            void saveKey(provider, draftKey.trim()).then(() => { setDraftKey(''); toast.success('Embedding provider key saved'); }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not save key'));
          }}>{isSavingKey ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}</Button>
        </div>
        <p className="text-xs text-muted-foreground">Uses the same saved provider key as your chat settings. Indexing sends only content you can access to this provider and may incur charges.</p>
      </>}
      <Button variant="outline" onClick={() => void persistEmbedding()} disabled={saving || isSavingKey || loadingModels || !models.some(option => option.id === model) || (provider !== 'local' && !savedKey?.configured)}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save embedding model
      </Button>
      <p className="text-xs text-muted-foreground">Saved only for you in this workspace. Changing the model starts a separate index; other users keep their own choices.</p>
    </section>
  );
}
