/**
 * Ice RAG — one-hop neighbour expansion over record links.
 *
 * A retrieved record pulls in the records it links to (breadth-first, depth
 * 1): task → project + latest comments, comment → task, project → latest
 * updates + recently updated open tasks, update → project. Events carry no
 * links. Every neighbour is read through `visibleSource`, so private records
 * stay hidden, and carries its own real anchor so citation checks still hold.
 */

import type { Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import { visibleSource } from './personal';
import type { RetrievedChunk } from './providers';

const MAX_SEEDS = 5;
const MAX_PER_SEED = 3;
const MAX_TOTAL = 10;
const NEIGHBOUR_TEXT_CHARS = 1200;
const NEIGHBOUR_SCORE_FACTOR = 0.8;
const OPEN_TASK_STATUSES = new Set(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW']);

type Link = { sourceType: 'task' | 'taskComment' | 'project' | 'projectUpdate'; sourceId: string };

async function linksOf(ctx: QueryCtx, workspaceId: Id<'workspaces'>, hit: RetrievedChunk): Promise<Link[]> {
  switch (hit.sourceType) {
    case 'task': {
      const task = await ctx.db.get(hit.sourceId as Id<'tasks'>);
      if (!task) return [];
      const comments = await ctx.db.query('taskComments').withIndex('by_task_created', q => q.eq('taskId', task._id)).order('desc').take(2);
      return [
        ...(task.projectId ? [{ sourceType: 'project' as const, sourceId: task.projectId }] : []),
        ...comments.map(comment => ({ sourceType: 'taskComment' as const, sourceId: comment._id })),
      ];
    }
    case 'taskComment': {
      const comment = await ctx.db.get(hit.sourceId as Id<'taskComments'>);
      return comment ? [{ sourceType: 'task', sourceId: comment.taskId }] : [];
    }
    case 'project': {
      const projectId = hit.sourceId as Id<'projects'>;
      const updates = await ctx.db.query('projectUpdates').withIndex('by_project_created', q => q.eq('projectId', projectId)).order('desc').take(2);
      const tasks = await ctx.db.query('tasks').withIndex('by_workspace_project', q => q.eq('workspaceId', workspaceId).eq('projectId', projectId)).take(100);
      const recentOpen = tasks.filter(task => OPEN_TASK_STATUSES.has(task.status)).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
      return [
        ...updates.map(update => ({ sourceType: 'projectUpdate' as const, sourceId: update._id })),
        ...recentOpen.map(task => ({ sourceType: 'task' as const, sourceId: task._id })),
      ];
    }
    case 'projectUpdate': {
      const update = await ctx.db.get(hit.sourceId as Id<'projectUpdates'>);
      return update ? [{ sourceType: 'project', sourceId: update.projectId }] : [];
    }
    default:
      return [];
  }
}

export async function expandNeighbours(ctx: QueryCtx, workspaceId: Id<'workspaces'>, userId: Id<'users'>, hits: RetrievedChunk[]): Promise<RetrievedChunk[]> {
  const seen = new Set(hits.map(hit => `${hit.sourceType}:${hit.sourceId}`));
  const neighbours: RetrievedChunk[] = [];
  for (const seed of hits.slice(0, MAX_SEEDS)) {
    let added = 0;
    for (const link of await linksOf(ctx, workspaceId, seed)) {
      if (added >= MAX_PER_SEED || neighbours.length >= MAX_TOTAL) break;
      const key = `${link.sourceType}:${link.sourceId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const source = await visibleSource(ctx, workspaceId, userId, link.sourceType, link.sourceId);
      if (!source) continue;
      neighbours.push({
        text: source.text.slice(0, NEIGHBOUR_TEXT_CHARS),
        title: source.title,
        anchor: source.anchor,
        sourceType: link.sourceType,
        sourceId: link.sourceId,
        score: seed.score * NEIGHBOUR_SCORE_FACTOR,
        target: source.target,
        via: seed.anchor,
      });
      added++;
    }
  }
  return neighbours;
}
