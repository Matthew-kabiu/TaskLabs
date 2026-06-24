import { z } from 'zod';

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a #rrggbb hex value');

export const createLabelSchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: hexColor,
});
export type CreateLabelInput = z.infer<typeof createLabelSchema>;

export const updateLabelSchema = z
  .object({
    name: z.string().trim().min(1).max(40),
    color: hexColor,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field is required',
  });
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
