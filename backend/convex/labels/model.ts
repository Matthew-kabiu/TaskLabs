import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbCtx = QueryCtx | MutationCtx;

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export class LabelNotFoundError extends Error {
  constructor(message = "Label not found") {
    super(message);
    this.name = "LabelNotFoundError";
  }
}

export function normalizeLabelName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 1) {
    throw new Error("Label name is required");
  }
  if (trimmed.length > 40) {
    throw new Error("Label name must be at most 40 characters");
  }
  return trimmed;
}

export function normalizeLabelColor(color: string) {
  const trimmed = color.trim();
  if (!HEX_COLOR_RE.test(trimmed)) {
    throw new Error("Label color must be a #rrggbb hex value");
  }
  return trimmed.toLowerCase();
}

export function labelDto(label: Doc<"labels">) {
  return {
    id: label._id,
    workspaceId: label.workspaceId,
    name: label.name,
    color: label.color,
    createdAt: new Date(label.createdAt).toISOString(),
    updatedAt: new Date(label.updatedAt).toISOString(),
  };
}

export async function listLabelRecords(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
) {
  const rows = await ctx.db
    .query("labels")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLabelInWorkspace(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  labelId: Id<"labels">,
) {
  const label = await ctx.db.get(labelId);
  if (label === null || label.workspaceId !== workspaceId) {
    throw new LabelNotFoundError();
  }
  return label;
}

export async function findLabelByName(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  name: string,
) {
  return await ctx.db
    .query("labels")
    .withIndex("by_workspace_name", (q) =>
      q.eq("workspaceId", workspaceId).eq("name", name),
    )
    .unique();
}

export async function deleteTaskLabelRowsForLabel(
  ctx: MutationCtx,
  labelId: Id<"labels">,
) {
  const rows = await ctx.db
    .query("taskLabels")
    .withIndex("by_label", (q) => q.eq("labelId", labelId))
    .collect();
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
}
