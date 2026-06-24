import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email('Invalid email');
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200, 'Password too long');
export const nameSchema = z.string().trim().min(1, 'Name is required').max(100);

export const setupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  workspaceName: z.string().trim().min(1).max(100),
});
export type SetupInput = z.infer<typeof setupSchema>;

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const systemSettingsPatchSchema = z.object({
  allowPublicRegistration: z.boolean(),
});
export type SystemSettingsPatch = z.infer<typeof systemSettingsPatchSchema>;
