import { z } from 'zod';

export const createTaskCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment is required').max(10_000, 'Comment too long'),
});
export type CreateTaskCommentInput = z.infer<typeof createTaskCommentSchema>;
