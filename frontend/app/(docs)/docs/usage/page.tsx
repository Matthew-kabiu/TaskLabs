import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/site';
import {
  DocsH1,
  DocsH2,
  DocsLead,
  DocsList,
  DocsP,
} from '@/components/docs/primitives';

export const metadata: Metadata = {
  title: 'Using TaskLabs — TaskLabs docs',
  description:
    'Tasks, calendar, workspaces, notifications, search, and Telegram in TaskLabs.',
  alternates: { canonical: absoluteUrl('/docs/usage') },
};

export default function DocsUsagePage() {
  return (
    <>
      <DocsH1>Using TaskLabs</DocsH1>
      <DocsLead>
        The day-to-day surface: boards, calendar, teams, and reminders.
      </DocsLead>

      <DocsH2 id="tasks">Tasks</DocsH2>
      <DocsP>
        Tasks live in workspaces and flow through an ordered status set:
        Backlog, Todo, In Progress, In Review, Done, Archived, and Cancelled.
        Switch between list and Kanban views, drag cards between columns, and
        open any task to edit it.
      </DocsP>
      <DocsList
        items={[
          <>Priorities use a blue / amber / orange / rose accent scale.</>,
          <>Attach labels and assignees to any task.</>,
          <>Set due dates; overdue and due-soon states are color-coded.</>,
          <>Reorder tasks to shape the board order.</>,
        ]}
      />

      <DocsH2 id="calendar">Calendar</DocsH2>
      <DocsP>
        The calendar shares scheduled tasks and standalone events with your
        workspace. Events support daily, weekly, and monthly recurrence in
        plain language, and private events stay visible only to their owner.
        Completed events can be toggled back and forth.
      </DocsP>

      <DocsH2 id="workspaces">Workspaces</DocsH2>
      <DocsP>
        Workspaces are the tenancy boundary. Members belong to one or more
        workspaces, and every task, event, label, and notification is scoped to
        the workspace it lives in. Owners can generate invitations, change
        member roles, and remove members.
      </DocsP>

      <DocsH2 id="notifications">Notifications</DocsH2>
      <DocsP>
        Assignment and event completion generate in-app notifications. The
        notification center lists them, tracks unread counts, and marks items
        or everything as read.
      </DocsP>

      <DocsH2 id="search">Search</DocsH2>
      <DocsP>
        Workspace search covers visible tasks, events, and labels. Use the
        command palette from anywhere in the app to jump between pages and find
        work fast.
      </DocsP>

      <DocsH2 id="telegram">Telegram</DocsH2>
      <DocsP>
        Connect a Telegram bot from Profile settings to receive task and event
        reminders. TaskLabs stores an encrypted token, registers a per-user
        webhook, and can send a test message to confirm the link. Chat linking
        requires a real public HTTPS origin for the Telegram webhook.
      </DocsP>
    </>
  );
}
