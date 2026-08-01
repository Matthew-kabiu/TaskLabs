'use client';

import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { renderNotification, TONE_CLASSES } from '@/lib/notifications/render';
import { DateTime } from '@/components/ui/date-time';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-medium text-background">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => markAllRead()}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-3 w-3" />
            Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              You&apos;re all caught up.
            </div>
          )}
          <ul className="divide-y">
            {notifications.map((n) => {
              const view = renderNotification(n);
              const tone = TONE_CLASSES[view.tone];
              const Icon = view.icon;
              const inner = (
                <div
                  className={cn(
                    'flex items-start gap-2.5 px-3 py-2.5',
                    n.readAt && 'opacity-60',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1',
                      tone.ring,
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5', tone.icon)} />
                  </span>
                  <div className="flex-1 text-sm leading-tight">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{view.title}</span>
                      {!n.readAt && (
                        <span
                          aria-hidden
                          className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        />
                      )}
                    </div>
                    {view.subtitle && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {view.subtitle}
                      </div>
                    )}
                    <DateTime
                      value={n.createdAt}
                      className="mt-0.5 block text-[11px] text-muted-foreground"
                    />
                  </div>
                </div>
              );
              return (
                <li key={n.id}>
                  {view.href ? (
                    <Link
                      href={view.href}
                      onClick={() => !n.readAt && markRead(n.id)}
                      className="block hover:bg-accent"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => !n.readAt && markRead(n.id)}
                      disabled={Boolean(n.readAt)}
                      className="block w-full text-left hover:bg-accent disabled:cursor-default"
                    >
                      {inner}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
