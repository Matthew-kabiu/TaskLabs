import { v } from 'convex/values';

export const citationArg = v.object({
  sourceType: v.union(v.literal('task'), v.literal('taskComment'), v.literal('project'), v.literal('projectUpdate'), v.literal('event'), v.literal('docs')),
  sourceId: v.string(), anchor: v.string(), title: v.string(), snippet: v.string(),
  target: v.union(
    v.object({ page: v.literal('task'), id: v.string() }),
    v.object({ page: v.literal('project'), id: v.string() }),
    v.object({ page: v.literal('event'), id: v.string() }),
    v.object({ page: v.literal('tasks') }),
    v.object({ page: v.literal('docs') }),
  ),
});
