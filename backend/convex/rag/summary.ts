/**
 * Ice RAG — live workspace summary for count and list questions.
 *
 * Retrieval only returns the closest few records, so it cannot answer "how
 * many" or "list all". This summary is computed fresh per question from the
 * canonical tables, respects the same visibility rules as retrieval, and is
 * sent to the chat model alongside the retrieved context.
 */

import type { Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import { canReadEvent } from '../events/model';
import { canReadTask } from '../tasks/model';

const DAY_MS = 86_400_000;
const CLOSED_TASK_STATUSES = new Set(['DONE', 'CANCELLED', 'ARCHIVED']);
const MAX_LISTED_PROJECTS = 50;
const MAX_LISTED_EVENTS = 10;

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export async function workspaceSummary(ctx: QueryCtx, workspaceId: Id<'workspaces'>, userId: Id<'users'>, now = Date.now()): Promise<string> {
  const projects = await ctx.db.query('projects').withIndex('by_workspace', q => q.eq('workspaceId', workspaceId)).collect();
  const tasks = (await ctx.db.query('tasks').withIndex('by_workspace', q => q.eq('workspaceId', workspaceId)).collect()).filter(task => canReadTask(task, userId));
  const events = (await ctx.db.query('calendarEvents').withIndex('by_workspace_start', q => q.eq('workspaceId', workspaceId).gte('startAt', now).lt('startAt', now + 7 * DAY_MS)).collect()).filter(event => canReadEvent(event, userId));

  const byStatus = new Map<string, number>();
  const openByProject = new Map<string, number>();
  let overdue = 0, dueToday = 0, dueNextWeek = 0;
  const endOfToday = now - (now % DAY_MS) + DAY_MS;
  for (const task of tasks) {
    byStatus.set(task.status, (byStatus.get(task.status) ?? 0) + 1);
    if (CLOSED_TASK_STATUSES.has(task.status)) continue;
    if (task.projectId) openByProject.set(task.projectId, (openByProject.get(task.projectId) ?? 0) + 1);
    if (task.dueDate === undefined) continue;
    if (task.dueDate < now) overdue++;
    else if (task.dueDate < endOfToday) dueToday++;
    else if (task.dueDate < now + 7 * DAY_MS) dueNextWeek++;
  }

  const lines = [`Today (UTC): ${isoDay(now)}`, `Projects: ${projects.length}`];
  for (const project of projects.slice(0, MAX_LISTED_PROJECTS)) {
    const dates = [project.startDate && `start ${isoDay(project.startDate)}`, project.endDate && `end ${isoDay(project.endDate)}`].filter(Boolean).join(', ');
    lines.push(`- ${project.title} — status ${project.status}, priority ${project.priority}, ${openByProject.get(project._id) ?? 0} open tasks${dates ? `, ${dates}` : ''}`);
  }
  if (projects.length > MAX_LISTED_PROJECTS) lines.push(`- …and ${projects.length - MAX_LISTED_PROJECTS} more`);
  lines.push(`Tasks visible to you: ${tasks.length} (${[...byStatus.entries()].map(([status, count]) => `${status} ${count}`).join(', ') || 'none'})`);
  lines.push(`Open tasks overdue: ${overdue}; due today: ${dueToday}; due in the next 7 days: ${dueNextWeek}`);
  lines.push(`Events in the next 7 days: ${events.length}`);
  for (const event of events.slice(0, MAX_LISTED_EVENTS)) lines.push(`- ${event.title} — ${new Date(event.startAt).toISOString()}`);
  return lines.join('\n');
}
