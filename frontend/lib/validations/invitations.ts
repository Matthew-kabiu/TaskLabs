import { z } from 'zod';

export const createInvitationSchema = z.object({
  email: z.string().email().max(255),
});

export const acceptInvitationSchema = z.object({
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120).optional(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
