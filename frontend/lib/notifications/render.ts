import {
  AlarmClock,
  Bell,
  CalendarCheck,
  CalendarClock,
  Clock,
  Mail,
  MessageSquare,
  Pencil,
  PlayCircle,
  Trash2,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { formatDateTime } from '@/lib/datetime';

export type NotificationLike = {
  type: string;
  payload: Record<string, unknown>;
};

export type NotificationView = {
  title: string;
  subtitle?: string;
  href: string | null;
  icon: LucideIcon;
  tone:
    | 'task'
    | 'event'
    | 'event-done'
    | 'event-reopen'
    | 'lead'
    | 'system'
    | 'mention';
};

function strOr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function leadLabel(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '';
  return n < 60 ? `${n}m` : `${n / 60}h`;
}

function fmtTime(iso: unknown): string {
  if (typeof iso !== 'string') return '';
  return formatDateTime(iso, 'datetime');
}

export function renderNotification(n: NotificationLike): NotificationView {
  const title = strOr(n.payload.title);

  switch (n.type) {
    case 'TASK_ASSIGNED':
      return {
        title: `Assigned to you: ${title}`,
        href:
          typeof n.payload.taskId === 'string'
            ? ROUTES.app.task(n.payload.taskId)
            : null,
        icon: UserPlus,
        tone: 'task',
      };

    case 'TASK_UPDATED':
      return {
        title: n.payload.deleted
          ? `Task deleted: ${title}`
          : `Task updated: ${title}`,
        href:
          typeof n.payload.taskId === 'string' && !n.payload.deleted
            ? ROUTES.app.task(n.payload.taskId)
            : null,
        icon: n.payload.deleted ? Trash2 : Pencil,
        tone: 'task',
      };

    case 'TASK_DUE_SOON': {
      const lead = leadLabel(n.payload.leadMinutes);
      const due = fmtTime(n.payload.dueDate);
      return {
        title: `Task due in ${lead}: ${title}`,
        subtitle: due ? `Due ${due}` : undefined,
        href:
          typeof n.payload.taskId === 'string'
            ? ROUTES.app.task(n.payload.taskId)
            : null,
        icon: AlarmClock,
        tone: 'lead',
      };
    }

    case 'EVENT_SOON': {
      const lead = leadLabel(n.payload.leadMinutes);
      const start = fmtTime(n.payload.startAt);
      const eventId = strOr(n.payload.eventId);
      return {
        title: `Event in ${lead}: ${title}`,
        subtitle: start ? `Starts ${start}` : undefined,
        href: eventId ? `${ROUTES.app.calendar}?event=${eventId}` : null,
        icon: CalendarClock,
        tone: 'event',
      };
    }

    case 'EVENT_STARTED': {
      const start = fmtTime(n.payload.startAt);
      const eventId = strOr(n.payload.eventId);
      return {
        title: `Event starting now: ${title}`,
        subtitle: start ? `Started ${start}` : undefined,
        href: eventId ? `${ROUTES.app.calendar}?event=${eventId}` : null,
        icon: PlayCircle,
        tone: 'event',
      };
    }

    case 'EVENT_COMPLETED': {
      const reopened = n.payload.reopened === true;
      const eventId = strOr(n.payload.eventId);
      return {
        title: reopened ? `Event reopened: ${title}` : `Event completed: ${title}`,
        subtitle: reopened ? 'Marked incomplete' : 'Marked done',
        href: eventId ? `${ROUTES.app.calendar}?event=${eventId}` : null,
        icon: reopened ? Clock : CalendarCheck,
        tone: reopened ? 'event-reopen' : 'event-done',
      };
    }

    case 'INVITE_ACCEPTED':
      return {
        title: 'Invite accepted',
        href: null,
        icon: Mail,
        tone: 'system',
      };

    case 'MENTION':
      return {
        title: `Mention: ${title}`,
        href:
          typeof n.payload.taskId === 'string'
            ? ROUTES.app.task(n.payload.taskId)
            : null,
        icon: MessageSquare,
        tone: 'mention',
      };

    case 'SYSTEM':
      return {
        title: strOr(n.payload.message, 'System notice'),
        href: null,
        icon: Bell,
        tone: 'system',
      };

    default:
      return { title: n.type, href: null, icon: Bell, tone: 'system' };
  }
}

export const TONE_CLASSES: Record<
  NotificationView['tone'],
  { icon: string; ring: string }
> = {
  task: { icon: 'text-sky-500', ring: 'bg-sky-500/10 ring-sky-500/20' },
  event: {
    icon: 'text-violet-500',
    ring: 'bg-violet-500/10 ring-violet-500/20',
  },
  'event-done': {
    icon: 'text-emerald-500',
    ring: 'bg-emerald-500/10 ring-emerald-500/20',
  },
  'event-reopen': {
    icon: 'text-amber-500',
    ring: 'bg-amber-500/10 ring-amber-500/20',
  },
  lead: {
    icon: 'text-orange-500',
    ring: 'bg-orange-500/10 ring-orange-500/20',
  },
  system: {
    icon: 'text-zinc-400',
    ring: 'bg-zinc-500/10 ring-zinc-500/20',
  },
  mention: {
    icon: 'text-pink-500',
    ring: 'bg-pink-500/10 ring-pink-500/20',
  },
};
