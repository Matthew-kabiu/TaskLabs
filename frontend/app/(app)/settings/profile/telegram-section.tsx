'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAction, useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import {
  Bell,
  CalendarClock,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { BACKEND_ROUTES } from '@/lib/routes';
import { getUserFacingError } from '@/lib/user-facing-error';
import { cn } from '@/lib/utils';
import {
  TASK_LEAD_PRESETS,
  EVENT_LEAD_PRESETS,
} from '@/lib/notifications/leadDefaults';

type Props = {
  user: {
    id: string;
    name: string | null;
    telegramBotTokenSet: boolean;
    telegramChatLinked: boolean;
    notifyLeadMinutesTask: number[];
    notifyLeadMinutesEvent: number[];
    notifyLeadCustomTask: boolean;
    notifyLeadCustomEvent: boolean;
  };
};

type TelegramSummary = {
  hasToken: boolean;
  suffix: string | null;
  chatLinked: boolean;
};

function fmtLead(m: number) {
  return m < 60 ? `${m}m` : `${m / 60}h`;
}

function toggleLead(
  arr: number[],
  value: number,
  setter: (next: number[]) => void,
) {
  setter(
    arr.includes(value)
      ? arr.filter((existing) => existing !== value)
      : [...arr, value].sort((a, b) => a - b),
  );
}

export function TelegramSection({ user }: Props) {
  const router = useRouter();
  const updateProfile = useMutation(BACKEND_ROUTES.profile.update);
  const saveToken = useMutation(BACKEND_ROUTES.telegram.saveToken);
  const clearToken = useMutation(BACKEND_ROUTES.telegram.clearToken);
  const linkChatFromStart = useAction(BACKEND_ROUTES.telegram.linkChatFromStart);
  const sendTest = useAction(BACKEND_ROUTES.telegram.sendTest);
  const tokenSummary = useQuery(BACKEND_ROUTES.telegram.tokenSummary, {}) as
    | TelegramSummary
    | undefined;
  const [tokenInput, setTokenInput] = useState('');
  const [tokenVisible, setTokenVisible] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [editing, setEditing] = useState(!user.telegramBotTokenSet);
  // Mirror server-side flags locally so the UI reflects PATCH outcomes
  // immediately without waiting for a full page reload.
  const [tokenSet, setTokenSet] = useState<boolean>(user.telegramBotTokenSet);
  const [linked, setLinked] = useState<boolean>(user.telegramChatLinked);
  const [taskLeads, setTaskLeads] = useState<number[]>(user.notifyLeadMinutesTask);
  const [eventLeads, setEventLeads] = useState<number[]>(user.notifyLeadMinutesEvent);
  const [taskCustom, setTaskCustom] = useState<boolean>(user.notifyLeadCustomTask);
  const [eventCustom, setEventCustom] = useState<boolean>(user.notifyLeadCustomEvent);
  const [savingToken, setSavingToken] = useState(false);
  const [savingLeads, setSavingLeads] = useState(false);
  const [linkingChat, setLinkingChat] = useState(false);
  const [showLink, setShowLink] = useState(false);

  async function onSaveToken(e: React.FormEvent) {
    e.preventDefault();
    setSavingToken(true);
    try {
      const data = (await saveToken({ token: tokenInput })) as TelegramSummary;
      toast.success('Bot token saved.');
      setTokenInput('');
      setTokenVisible(false);
      setEditing(false);
      setTokenSet(data.hasToken);
      setLinked(data.chatLinked);
      setShowLink(!data.chatLinked);
      router.refresh();
    } catch (err) {
      toast.error(getUserFacingError(err, 'Could not save the bot token.'));
    } finally {
      setSavingToken(false);
    }
  }

  async function onClearToken() {
    setSavingToken(true);
    try {
      await clearToken({});
      toast.success('Bot token cleared.');
      setRevealed(null);
      setEditing(true);
      setTokenSet(false);
      setLinked(false);
      setShowLink(false);
      router.refresh();
    } catch (err) {
      toast.error(getUserFacingError(err, 'Could not remove the bot token.'));
    } finally {
      setSavingToken(false);
    }
  }

  async function onSendTest() {
    try {
      await sendTest({});
      toast.success('Test sent.');
    } catch (err) {
      toast.error(getUserFacingError(err, 'Could not send the test message.'));
    }
  }

  async function onLinkChat() {
    setLinkingChat(true);
    try {
      const data = (await linkChatFromStart({})) as TelegramSummary;
      toast.success('Chat linked.');
      setTokenSet(data.hasToken);
      setLinked(data.chatLinked);
      setShowLink(!data.chatLinked);
      router.refresh();
    } catch (err) {
      toast.error(getUserFacingError(err, 'Could not link your Telegram chat.'));
    } finally {
      setLinkingChat(false);
    }
  }

  async function onToggleReveal() {
    if (revealed) {
      setRevealed(null);
      return;
    }
    setRevealing(true);
    try {
      if (!tokenSummary?.hasToken) {
        setRevealed(null);
        toast.error('No bot token saved.');
        return;
      }
      setRevealed(`••••••••${tokenSummary.suffix ?? ''}`);
    } catch (err) {
      toast.error(getUserFacingError(err, 'Could not check the bot token.'));
    } finally {
      setRevealing(false);
    }
  }

  async function onSaveLeads() {
    setSavingLeads(true);
    try {
      await updateProfile({
        notifyLeadMinutesTask: taskLeads,
        notifyLeadMinutesEvent: eventLeads,
        notifyLeadCustomTask: taskCustom,
        notifyLeadCustomEvent: eventCustom,
      });
      toast.success('Lead times updated.');
    } catch (err) {
      toast.error(getUserFacingError(err, 'Could not update reminder timing.'));
    } finally {
      setSavingLeads(false);
    }
  }

  return (
    <section className="space-y-8 rounded-lg border bg-card p-6 md:p-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md bg-sky-500/10 text-sky-500">
            <Bell className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-medium">Telegram reminders</h2>
            <p className="text-sm text-muted-foreground">
              Create a bot via{' '}
              <span className="font-mono text-foreground/80">@BotFather</span>{' '}
              and paste its token here. Then send{' '}
              <span className="font-mono text-foreground/80">/start</span> to your bot.
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'shrink-0 gap-1.5 border-emerald-500/30 bg-emerald-500/5 text-emerald-500',
          )}
          title="Tokens are encrypted at rest with AES-256-GCM"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Encrypted at rest
        </Badge>
      </header>

      {/* Two-column workspace */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* ── Bot token ─────────────────────────────────────────────── */}
        <form onSubmit={onSaveToken} className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5" />
            Authentication
          </div>

          <div className="space-y-2">
            <Label htmlFor="botToken">Bot token</Label>
            {editing ? (
              <div className="relative">
                <Input
                  id="botToken"
                  type={tokenVisible ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="123456:AAH..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setTokenVisible((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={tokenVisible ? 'Hide bot token' : 'Show bot token'}
                  title={tokenVisible ? 'Hide bot token' : 'Show bot token'}
                >
                  {tokenVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  id="botToken"
                  value={revealed ?? '••••••••••••••••••'}
                  readOnly
                  className={cn('pr-10', revealed && 'font-mono text-xs')}
                  onFocus={(e) => revealed && e.currentTarget.select()}
                />
                <button
                  type="button"
                  onClick={onToggleReveal}
                  disabled={revealing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  aria-label={revealed ? 'Hide bot token' : 'Reveal bot token'}
                  title={revealed ? 'Hide bot token' : 'Reveal bot token'}
                >
                  {revealing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : revealed ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              Stored encrypted (AES-256-GCM, key derived per-instance).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <Button
                  type="submit"
                  disabled={savingToken || tokenInput.length === 0}
                  className="gap-1.5"
                >
                  {savingToken ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingToken ? 'Saving…' : 'Save token'}
                </Button>
                {tokenSet && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => {
                      setTokenInput('');
                      setTokenVisible(false);
                      setEditing(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => setEditing(true)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-1.5 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                  onClick={onClearToken}
                  disabled={savingToken}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              </>
            )}
          </div>
        </form>

        {/* ── Connection status ─────────────────────────────────────── */}
        <div className="space-y-4 rounded-md border bg-muted/30 p-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" />
            Connection
          </div>

          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className={cn(
                'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
                linked
                  ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]'
                  : 'bg-zinc-500',
              )}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {linked ? 'Chat linked' : 'Chat not linked'}
              </p>
              <p className="text-xs text-muted-foreground">
                {linked
                  ? 'Reminders will be delivered to your Telegram chat.'
                  : 'Send /start to your bot, then click Link chat.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="gap-1.5"
              onClick={onSendTest}
              disabled={!tokenSet}
            >
              <Send className="h-4 w-4" />
              Send test
            </Button>
            {(showLink || !linked) && (
              <Button
                type="button"
                variant="ghost"
                className="gap-1.5"
                onClick={onLinkChat}
                disabled={!tokenSet || linkingChat}
              >
                {linkingChat ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                {linkingChat ? 'Linking…' : 'Link chat'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Lead times ──────────────────────────────────────────────── */}
      <div className="space-y-6 border-t pt-6">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          Reminder timing
        </div>

        <p className="text-xs text-muted-foreground">
          With <span className="font-medium text-foreground">Use defaults</span> on, reminders fire at
          every preset below. Turn it off to pick exactly which ones fire. In-app and Telegram both follow
          these settings.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <LeadColumn
            label="Task lead times"
            sub="Minutes before due"
            options={TASK_LEAD_PRESETS}
            selected={taskLeads}
            useDefaults={!taskCustom}
            onToggleUseDefaults={(v) => setTaskCustom(!v)}
            onToggle={(m) => toggleLead(taskLeads, m, setTaskLeads)}
            activeClassName="bg-sky-500 text-white hover:bg-sky-500/90"
            hoverClassName="hover:border-sky-500/50 hover:text-sky-500"
          />
          <LeadColumn
            label="Event lead times"
            sub="Minutes before start"
            options={EVENT_LEAD_PRESETS}
            selected={eventLeads}
            useDefaults={!eventCustom}
            onToggleUseDefaults={(v) => setEventCustom(!v)}
            onToggle={(m) => toggleLead(eventLeads, m, setEventLeads)}
            activeClassName="bg-violet-500 text-white hover:bg-violet-500/90"
            hoverClassName="hover:border-violet-500/50 hover:text-violet-500"
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            onClick={onSaveLeads}
            disabled={savingLeads}
            className="gap-1.5"
          >
            {savingLeads ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {savingLeads ? 'Saving…' : 'Save lead times'}
          </Button>
        </div>
      </div>
    </section>
  );
}

function fmtLeadLocal(m: number) {
  return fmtLead(m);
}

function LeadColumn(props: {
  label: string;
  sub: string;
  options: number[];
  selected: number[];
  useDefaults: boolean;
  onToggleUseDefaults: (next: boolean) => void;
  onToggle: (m: number) => void;
  activeClassName: string;
  hoverClassName: string;
}) {
  const { label, sub, options, selected, useDefaults, onToggleUseDefaults, onToggle, activeClassName, hoverClassName } = props;
  const switchId = `lead-defaults-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium leading-none">{label}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
        <Label
          htmlFor={switchId}
          className="flex shrink-0 cursor-pointer items-center gap-2"
        >
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs">Use defaults</span>
          <Switch
            id={switchId}
            checked={useDefaults}
            onCheckedChange={onToggleUseDefaults}
            aria-label={`Use default ${label.toLowerCase()}`}
          />
        </Label>
      </div>
      <div className={cn('flex flex-wrap gap-2', useDefaults && 'opacity-60')}>
        {options.map((m) => {
          const active = useDefaults || selected.includes(m);
          return (
            <Badge
              key={m}
              variant={active ? 'default' : 'outline'}
              aria-pressed={active}
              className={cn(
                'select-none px-3 py-1 text-xs transition-colors',
                useDefaults ? 'cursor-not-allowed' : 'cursor-pointer',
                active ? activeClassName : hoverClassName,
              )}
              onClick={() => {
                if (useDefaults) return;
                onToggle(m);
              }}
            >
              {fmtLeadLocal(m)}
            </Badge>
          );
        })}
      </div>
      {useDefaults && (
        <p className="text-[11px] text-muted-foreground">All presets active.</p>
      )}
    </div>
  );
}
