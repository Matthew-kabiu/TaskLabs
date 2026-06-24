import { z } from 'zod';
import { EVENT_HUE_IDS } from '@/lib/calendar/palette';

const isoDate = z
  .string()
  .min(1)
  .transform((s, ctx) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid ISO date' });
      return z.NEVER;
    }
    return d;
  });

const colorEnum = z.enum(EVENT_HUE_IDS as unknown as [string, ...string[]]);

const baseShape = {
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullish(),
  startAt: isoDate,
  endAt: isoDate,
  allDay: z.boolean().default(false),
  color: colorEnum.nullish(),
  location: z.string().max(200).nullish(),
  isPrivate: z.boolean().default(false),
  rrule: z.string().min(1).max(500).nullish(),
};

export const eventCreateSchema = z
  .object(baseShape)
  .refine((v) => v.endAt.getTime() >= v.startAt.getTime(), {
    message: 'endAt must be at or after startAt',
    path: ['endAt'],
  });

export const eventUpdateSchema = z
  .object({
    title: baseShape.title.optional(),
    description: baseShape.description,
    startAt: isoDate.optional(),
    endAt: isoDate.optional(),
    allDay: z.boolean().optional(),
    color: baseShape.color,
    location: baseShape.location,
    isPrivate: z.boolean().optional(),
    rrule: baseShape.rrule,
  })
  .refine(
    (v) =>
      !v.startAt || !v.endAt || v.endAt.getTime() >= v.startAt.getTime(),
    { message: 'endAt must be at or after startAt', path: ['endAt'] },
  );

export const eventListQuerySchema = z
  .object({ from: isoDate, to: isoDate })
  .refine(
    (v) =>
      v.to instanceof Date &&
      v.from instanceof Date &&
      v.to.getTime() > v.from.getTime(),
    {
      message: 'to must be after from',
      path: ['to'],
    },
  );

export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
export type EventListQuery = z.infer<typeof eventListQuerySchema>;
