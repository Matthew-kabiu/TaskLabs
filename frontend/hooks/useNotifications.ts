'use client';

import { useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import { BACKEND_ROUTES } from '@/lib/routes';

export type NotificationRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export function useNotifications(limit = 20) {
  const notifications = useQuery(BACKEND_ROUTES.notifications.list, { limit }) as
    | NotificationRow[]
    | undefined;
  const unreadCount = useQuery(BACKEND_ROUTES.notifications.unread, {}) as
    | number
    | undefined;
  const markReadMutation = useMutation(BACKEND_ROUTES.notifications.markRead);
  const markAllReadMutation = useMutation(BACKEND_ROUTES.notifications.markAllRead);

  const markRead = useCallback(
    async (id: string) => {
      await markReadMutation({ notificationId: id as Id<'notifications'> });
    },
    [markReadMutation],
  );
  const markAllRead = useCallback(async () => {
    await markAllReadMutation({});
  }, [markAllReadMutation]);

  return {
    notifications: notifications ?? [],
    unreadCount: unreadCount ?? 0,
    isLoading: notifications === undefined || unreadCount === undefined,
    markRead,
    markAllRead,
  };
}
