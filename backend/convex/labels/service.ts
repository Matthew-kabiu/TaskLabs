import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  requireMembership,
  requireMembershipForUser,
  requireWorkspaceRole,
  requireWorkspaceRoleForUser,
} from "../lib/auth";
import {
  deleteTaskLabelRowsForLabel,
  findLabelByName,
  getLabelInWorkspace,
  labelDto,
  listLabelRecords,
  normalizeLabelColor,
  normalizeLabelName,
} from "./model";

export type CreateLabelInput = {
  name: string;
  color: string;
};

export type UpdateLabelInput = {
  name?: string;
  color?: string;
};

async function assertUniqueLabelName(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  name: string,
  exceptId?: Id<"labels">,
) {
  const existing = await findLabelByName(ctx, workspaceId, name);
  if (existing !== null && existing._id !== exceptId) {
    throw new Error("A label with that name already exists");
  }
}

export async function listLabels(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
) {
  await requireMembership(ctx, workspaceId);
  return await listLabelsForActor(ctx, workspaceId, undefined, true);
}

export async function listLabelsForActor(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  userId?: Id<"users">,
  membershipProven = false,
) {
  if (!membershipProven) {
    if (userId === undefined) throw new Error("Actor user is required");
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  return (await listLabelRecords(ctx, workspaceId)).map(labelDto);
}

export async function createLabel(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  input: CreateLabelInput,
) {
  await requireWorkspaceRole(ctx, workspaceId, "MEMBER");
  return await createLabelForActor(ctx, workspaceId, undefined, input, true);
}

export async function createLabelForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users"> | undefined,
  input: CreateLabelInput,
  membershipProven = false,
) {
  if (!membershipProven) {
    if (userId === undefined) throw new Error("Actor user is required");
    await requireWorkspaceRoleForUser(ctx, workspaceId, userId, "MEMBER");
  }
  const now = Date.now();
  const name = normalizeLabelName(input.name);
  await assertUniqueLabelName(ctx, workspaceId, name);
  const labelId = await ctx.db.insert("labels", {
    workspaceId,
    name,
    color: normalizeLabelColor(input.color),
    createdAt: now,
    updatedAt: now,
  });
  const label = await ctx.db.get(labelId);
  if (label === null) {
    throw new Error("Label not found after create");
  }
  return labelDto(label);
}

export async function updateLabel(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  labelId: Id<"labels">,
  input: UpdateLabelInput,
) {
  await requireWorkspaceRole(ctx, workspaceId, "MEMBER");
  return await updateLabelForActor(
    ctx,
    workspaceId,
    undefined,
    labelId,
    input,
    true,
  );
}

export async function updateLabelForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users"> | undefined,
  labelId: Id<"labels">,
  input: UpdateLabelInput,
  membershipProven = false,
) {
  if (!membershipProven) {
    if (userId === undefined) throw new Error("Actor user is required");
    await requireWorkspaceRoleForUser(ctx, workspaceId, userId, "MEMBER");
  }
  const existing = await getLabelInWorkspace(ctx, workspaceId, labelId);
  const patch: Partial<typeof existing> = { updatedAt: Date.now() };

  if (input.name !== undefined) {
    const name = normalizeLabelName(input.name);
    await assertUniqueLabelName(ctx, workspaceId, name, labelId);
    patch.name = name;
  }
  if (input.color !== undefined) {
    patch.color = normalizeLabelColor(input.color);
  }
  if (Object.keys(patch).length < 2) {
    throw new Error("At least one field is required");
  }

  await ctx.db.patch(labelId, patch);
  const label = await ctx.db.get(labelId);
  if (label === null) {
    throw new Error("Label not found after update");
  }
  return labelDto(label);
}

export async function removeLabel(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  labelId: Id<"labels">,
) {
  await requireWorkspaceRole(ctx, workspaceId, "MEMBER");
  return await removeLabelForActor(ctx, workspaceId, undefined, labelId, true);
}

export async function removeLabelForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users"> | undefined,
  labelId: Id<"labels">,
  membershipProven = false,
) {
  if (!membershipProven) {
    if (userId === undefined) throw new Error("Actor user is required");
    await requireWorkspaceRoleForUser(ctx, workspaceId, userId, "MEMBER");
  }
  await getLabelInWorkspace(ctx, workspaceId, labelId);
  await deleteTaskLabelRowsForLabel(ctx, labelId);
  await ctx.db.delete(labelId);
  return null;
}
