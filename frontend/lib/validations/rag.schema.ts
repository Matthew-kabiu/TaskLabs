import { z } from 'zod';

const workspaceId = z.string().min(1, 'Workspace is required');
const question = z.string().trim().min(1, 'Ask a question').max(2000, 'Question too long');

export const iceQuerySchema = z.object({
  action: z.literal('query'),
  workspaceId,
  question,
  generation: z.number().int().nonnegative(),
  requestId: z.string().min(1).max(100),
  topK: z.number().int().min(1).max(20).optional(),
});

export const iceAskSchema = z.object({
  action: z.literal('ask'),
  workspaceId,
  question,
  generation: z.number().int().nonnegative(),
  requestId: z.string().min(1).max(100),
  topK: z.number().int().min(1).max(20).optional(),
  provider: z.enum(['local', 'gemini', 'claude', 'openai', 'openrouter']).default('local'),
  byokModel: z.string().max(240).optional(),
  byokKey: z.string().max(500).optional(),
});

export const iceModelsSchema = z.object({
  action: z.literal('models'),
  workspaceId,
  provider: z.enum(['gemini', 'claude', 'openai', 'openrouter']),
  byokKey: z.string().min(1).max(500).optional(),
  purpose: z.enum(['chat', 'embedding']).default('chat'),
});

export const iceIndexSchema = z.object({
  action: z.literal('index'),
  workspaceId,
});

export const iceRequestSchema = z.discriminatedUnion('action', [
  iceQuerySchema,
  iceAskSchema,
  iceModelsSchema,
  iceIndexSchema,
]);

export type IceRequestInput = z.infer<typeof iceRequestSchema>;

export const iceFeedbackSchema = z.object({
  question,
  rating: z.enum(['up', 'down']),
  reason: z.string().max(500).optional(),
});
export type IceFeedbackInput = z.infer<typeof iceFeedbackSchema>;
