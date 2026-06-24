import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(80),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(80),
});

export const removeMemberSchema = z.object({
  userId: z.string().min(1),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
