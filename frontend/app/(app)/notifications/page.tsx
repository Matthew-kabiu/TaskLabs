'use client';

import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { renderNotification, TONE_CLASSES } from '@/lib/notifications/render';

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
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
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
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
          <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No notifications</h3>
          <p className="text-sm text-muted-foreground">
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
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
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
