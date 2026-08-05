'use client';

import Link from 'next/link';
import { CheckCheck, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { renderNotification, TONE_CLASSES } from '@/lib/notifications/render';
import { DateTime } from '@/components/ui/date-time';

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead, isLoading } = useNotifications();

  const handleMarkRead = async (id: string) => {
    try {
      await markRead(id);
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-2">
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/30 p-12 text-center">
          <span className="mb-5 grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            <CircleCheck className="h-6 w-6" />
          </span>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">Inbox zero</p>
          <h3 className="text-lg font-medium">You are all caught up</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            You&apos;re all caught up. New notifications will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {notifications.map((n) => {
            const view = renderNotification(n);
            const tone = TONE_CLASSES[view.tone];
            const Icon = view.icon;
            const body = (
              <div
                className={cn(
                  'group flex items-start gap-3 px-4 py-3 transition-colors',
                  n.readAt ? 'opacity-60' : 'hover:bg-muted/40',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1',
                    tone.ring,
                  )}
                >
                  <Icon className={cn('h-4 w-4', tone.icon)} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-tight">
                      {view.title}
                    </p>
                    {!n.readAt && (
                      <span
                        aria-label="Unread"
                        className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-primary"
                      />
                    )}
                  </div>
                  {view.subtitle && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {view.subtitle}
                    </p>
                  )}
                  <DateTime
                    value={n.createdAt}
                    className="mt-1 block text-[11px] text-muted-foreground"
                  />
                </div>
                {!n.readAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 shrink-0 self-center opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMarkRead(n.id);
                    }}
                  >
                    <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                    Mark read
                  </Button>
                )}
              </div>
            );
            return (
              <li key={n.id}>
                {view.href ? (
                  <Link
                    href={view.href}
                    onClick={() => !n.readAt && handleMarkRead(n.id)}
                  >
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
