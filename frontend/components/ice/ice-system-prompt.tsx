'use client';

import { useState } from 'react';
import { Loader2, MessageSquareText, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useIcePreferences } from '@/hooks/useIce';

const ICE_SYSTEM_PROMPT_MAX = 4000;

export function IceSystemPrompt() {
  const { prefs, activeWorkspaceId } = useIcePreferences();
  if (prefs === undefined || !activeWorkspaceId) return <p className="text-xs text-muted-foreground">Loading instructions…</p>;
  const saved = prefs?.systemPrompt ?? '';
  // Remount when the saved value changes so the draft starts from it.
  return <PromptForm key={`${activeWorkspaceId}:${saved}`} saved={saved} />;
}

function PromptForm({ saved }: { saved: string }) {
  const { saveSystemPrompt, isSavingSystemPrompt } = useIcePreferences();
  const [draft, setDraft] = useState(saved);
  const dirty = draft.trim() !== saved;

  const save = (prompt: string) => {
    void saveSystemPrompt(prompt)
      .then(() => toast.success(prompt.trim() ? 'Ice instructions saved' : 'Ice instructions reset to default'))
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not save instructions'));
  };

  return (
    <section className="flex flex-col gap-2 border-t border-border pt-4" aria-labelledby="ice-prompt-heading">
      <div className="flex items-center gap-2">
        <MessageSquareText className="size-4 text-muted-foreground" />
        <h4 id="ice-prompt-heading" className="text-sm font-medium">
          System prompt
        </h4>
      </div>
      <Label htmlFor="ice-system-prompt" className="text-xs text-muted-foreground">
        Your instructions for Ice, e.g. tone, format or focus. Ice&apos;s grounding and safety rules always apply first.
      </Label>
      <Textarea
        id="ice-system-prompt"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={ICE_SYSTEM_PROMPT_MAX}
        rows={4}
        placeholder="Answer in short bullet points and flag overdue work first."
      />
      <div className="flex items-center gap-1">
        <span className="font-mono text-[11px] text-muted-foreground">
          {draft.length}/{ICE_SYSTEM_PROMPT_MAX}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto"
          disabled={isSavingSystemPrompt || !saved}
          onClick={() => save('')}
        >
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={isSavingSystemPrompt || !dirty} onClick={() => save(draft)}>
          {isSavingSystemPrompt ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">Used when a chat provider model answers. The local grounded answer ignores it.</p>
    </section>
  );
}
