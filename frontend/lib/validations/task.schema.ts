import { z } from 'zod';

export const TaskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED', 'BACKLOG', 'IN_REVIEW', 'CANCELLED']);
export const PriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const TaskSortEnum = z.enum(['manual', 'dueDate', 'priority', 'createdAt', 'title']);

const isoToDate = z
  .union([z.iso.datetime({ offset: true }), z.date()])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

const nullableIsoToDate = z
  .union([z.iso.datetime({ offset: true }), z.date(), z.null()])
  .transform((v) => (v == null ? null : v instanceof Date ? v : new Date(v)));

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(10_000).optional(),
  status: TaskStatusEnum.default('TODO'),
  priority: PriorityEnum.default('MEDIUM'),
  dueDate: isoToDate.optional(),
  isPrivate: z.boolean().default(false),
  assigneeIds: z.array(z.string().min(1)).default([]),
  labelIds: z.array(z.string().min(1)).default([]),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(10_000).nullable(),
    status: TaskStatusEnum,
    priority: PriorityEnum,
    dueDate: nullableIsoToDate,
    isPrivate: z.boolean(),
    assigneeIds: z.array(z.string().min(1)),
    labelIds: z.array(z.string().min(1)),
    completedAt: nullableIsoToDate,
    position: z.number().finite(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field is required',
  });
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const reorderTasksSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        position: z.number().finite(),
      }),
    )
    .min(1, 'items must contain at least one entry'),
});
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;

export const listTasksQuerySchema = z.object({
  status: TaskStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  q: z.string().trim().min(1).max(200).optional(),
  sort: TaskSortEnum.default('manual'),
  dueFrom: z.iso.datetime({ offset: true }).optional(),
  dueTo: z.iso.datetime({ offset: true }).optional(),
});
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
