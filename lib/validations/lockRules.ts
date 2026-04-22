// Zod validation schemas for lock rules API

import { z } from 'zod';

// Lock type enum
export const lockTypeSchema = z.enum(['timer', 'schedule', 'until_date', 'nuclear']);

// Base lock rule schema
export const createLockRuleSchema = z.object({
  app_name: z.string().min(1, 'App name is required').max(100),
  app_icon_url: z.string().url().optional().nullable(),
  app_scheme: z.string().optional().nullable(),
  lock_type: lockTypeSchema,
  daily_limit_minutes: z.number().int().min(1).max(1440).optional().nullable(),
  schedule_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)').optional().nullable(),
  schedule_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)').optional().nullable(),
  schedule_days: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).optional().nullable(),
  unlock_date: z.string().date('Invalid date format (YYYY-MM-DD)').optional().nullable(),
  hide_from_home: z.boolean().optional(),
  hide_from_search: z.boolean().optional(),
  strict_mode: z.boolean().optional(),
}).refine(
  (data) => {
    // Timer lock requires daily_limit_minutes
    if (data.lock_type === 'timer') {
      return data.daily_limit_minutes !== null && data.daily_limit_minutes !== undefined;
    }
    return true;
  },
  {
    message: 'Timer lock requires daily_limit_minutes',
    path: ['daily_limit_minutes'],
  }
).refine(
  (data) => {
    // Schedule lock requires schedule_start, schedule_end, and schedule_days
    if (data.lock_type === 'schedule') {
      return (
        data.schedule_start !== null && data.schedule_start !== undefined &&
        data.schedule_end !== null && data.schedule_end !== undefined &&
        data.schedule_days !== null && data.schedule_days !== undefined &&
        data.schedule_days.length > 0
      );
    }
    return true;
  },
  {
    message: 'Schedule lock requires schedule_start, schedule_end, and schedule_days',
    path: ['schedule_start'],
  }
).refine(
  (data) => {
    // Until date lock requires unlock_date
    if (data.lock_type === 'until_date') {
      return data.unlock_date !== null && data.unlock_date !== undefined;
    }
    return true;
  },
  {
    message: 'Until date lock requires unlock_date',
    path: ['unlock_date'],
  }
);

// Update lock rule schema (all fields optional except those being updated)
export const updateLockRuleSchema = z.object({
  app_name: z.string().min(1).max(100).optional(),
  app_icon_url: z.string().url().optional().nullable(),
  app_scheme: z.string().optional().nullable(),
  lock_type: lockTypeSchema.optional(),
  daily_limit_minutes: z.number().int().min(1).max(1440).optional().nullable(),
  schedule_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(),
  schedule_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(),
  schedule_days: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).optional().nullable(),
  unlock_date: z.string().date().optional().nullable(),
  hide_from_home: z.boolean().optional(),
  hide_from_search: z.boolean().optional(),
  strict_mode: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export type CreateLockRuleInput = z.infer<typeof createLockRuleSchema>;
export type UpdateLockRuleInput = z.infer<typeof updateLockRuleSchema>;
