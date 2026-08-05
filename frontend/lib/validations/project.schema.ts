import { z } from 'zod';

export const ProjectStatusEnum = z.enum([
  'PLANNING',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
]);
export const ProjectPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const ProjectResourceTypeEnum = z.enum([
  'WEBSITE',
  'FORM',
  'DATABASE',
  'GITHUB',
  'COMMUNICATION',
  'CUSTOM',
]);

const projectUrl = z
  .string()
  .trim()
  .min(1, 'URL is required')
  .max(2048, 'URL too long')
  .refine((value) => {
    try {
      return new URL(value).protocol !== '';
    } catch {
      return false;
    }
  }, 'URL must include a protocol (for example https://)');

export const projectResourceSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(200, 'Label too long'),
  type: ProjectResourceTypeEnum,
  url: projectUrl,
});
export type ProjectResourceInput = z.infer<typeof projectResourceSchema>;

const isoToDate = z
  .union([z.iso.datetime({ offset: true }), z.date()])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

const nullableIsoToDate = z
  .union([z.iso.datetime({ offset: true }), z.date(), z.null()])
  .transform((v) => (v == null ? null : v instanceof Date ? v : new Date(v)));

export const createProjectSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(10_000).optional(),
  status: ProjectStatusEnum.default('PLANNING'),
  priority: ProjectPriorityEnum.default('MEDIUM'),
  memberIds: z.array(z.string().min(1)).default([]),
  startDate: isoToDate.optional(),
  endDate: nullableIsoToDate.optional(),
  resources: z.array(projectResourceSchema).default([]),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(10_000).nullable(),
    status: ProjectStatusEnum,
    priority: ProjectPriorityEnum,
    memberIds: z.array(z.string().min(1)),
    startDate: nullableIsoToDate,
    endDate: nullableIsoToDate,
    resources: z.array(projectResourceSchema),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field is required',
  });
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const createProjectUpdateSchema = z.object({
  body: z.string().trim().min(1, 'Update is required').max(10_000, 'Update too long'),
});
export type CreateProjectUpdateInput = z.infer<typeof createProjectUpdateSchema>;

export const listProjectsQuerySchema = z.object({
  status: ProjectStatusEnum.optional(),
  priority: ProjectPriorityEnum.optional(),
  q: z.string().trim().min(1).max(200).optional(),
});
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
