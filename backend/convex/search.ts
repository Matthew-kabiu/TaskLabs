import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireMembership, requireMembershipForUser } from "./lib/auth";
import { canReadEvent, eventDto } from "./events/model";
import { canReadTask, taskDto, taskRelationsDto } from "./tasks/model";

function normalizeQuery(q: string) {
  const trimmed = q.trim().toLowerCase();
  if (trimmed.length > 120) {
    throw new Error("Search query must be at most 120 characters");
  }
  return trimmed;
}

export const workspace = query({
  args: {
    workspaceId: v.id("workspaces"),
    q: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireMembership(ctx, args.workspaceId);
    return await searchWorkspaceForActor(
      ctx,
      args.workspaceId,
      userId,
      args.q,
      args.limit,
      true,
    );
  },
});

export async function searchWorkspaceForActor(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  rawQuery: string,
  rawLimit?: number,
  membershipProven = false,
) {
    if (!membershipProven) {
      await requireMembershipForUser(ctx, workspaceId, userId);
    }
    const q = normalizeQuery(rawQuery);
    const limit = rawLimit ?? 8;
    if (!Number.isInteger(limit) || limit < 1 || limit > 25) {
      throw new Error("Search limit must be an integer from 1 to 25");
    }
    if (q.length < 1) {
      return { tasks: [], events: [], labels: [] };
    }

    const [taskRows, eventRows, labelRows] = await Promise.all([
      ctx.db
        .query("tasks")
        .withIndex("by_workspace", (builder) =>
          builder.eq("workspaceId", workspaceId),
        )
        .collect(),
      ctx.db
        .query("calendarEvents")
        .withIndex("by_workspace", (builder) =>
          builder.eq("workspaceId", workspaceId),
        )
        .collect(),
      ctx.db
        .query("labels")
        .withIndex("by_workspace", (builder) =>
          builder.eq("workspaceId", workspaceId),
        )
        .collect(),
    ]);

    const tasks = await Promise.all(
      taskRows
        .filter((task) => {
          if (!canReadTask(task, userId)) return false;
          return `${task.title}\n${task.description ?? ""}`
            .toLowerCase()
            .includes(q);
        })
        .slice(0, limit)
        .map(async (task) =>
          taskDto(task, await taskRelationsDto(ctx, task._id)),
        ),
    );

    const events = eventRows
      .filter((event) => {
        if (!canReadEvent(event, userId)) return false;
        return `${event.title}\n${event.description ?? ""}`
          .toLowerCase()
          .includes(q);
      })
      .slice(0, limit)
      .map((event) => eventDto(event));

    const labels = labelRows
      .filter((label) => label.name.toLowerCase().includes(q))
      .slice(0, limit)
      .map((label) => ({
        id: label._id,
        workspaceId: label.workspaceId,
        name: label.name,
        color: label.color,
      }));

    return { tasks, events, labels };
}
