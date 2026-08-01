import { z } from 'zod';

// Zod 4 deprecates the `.email()` method in favour of the top-level `z.email()`
// format schema. Normalization still has to run first, so the string schema is
// piped into the format check.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Invalid email'));
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
