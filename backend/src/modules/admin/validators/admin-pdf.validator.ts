import { z } from 'zod';

// Months array for validation
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

// Current year and reasonable range
const currentYear = new Date().getFullYear();
const MIN_YEAR = 2020;
const MAX_YEAR = currentYear + 5;

export const adminPdfUploadSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters')
      .trim(),

    shortDescription: z
      .string()
      .max(500, 'Short description must be less than 500 characters')
      .trim()
      .optional(),

    issue: z
      .enum(MONTHS, {
        message: 'Issue must be a valid month name'
      }),

    volume: z
      .string()
      .regex(/^\d{4}$/, 'Volume must be a 4-digit year')
      .refine(
        (year) => {
          const yearNum = parseInt(year);
          return yearNum >= MIN_YEAR && yearNum <= MAX_YEAR;
        },
        {
          message: `Volume must be between ${MIN_YEAR} and ${MAX_YEAR}`
        }
      )
  })
});

export const adminPdfUpdateSchema = z.object({
  params: z.object({
    id: z.string()
      .min(1, 'PDF ID is required')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid PDF ID format')
  }),
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters')
      .trim()
      .optional(),

    shortDescription: z
      .string()
      .max(500, 'Short description must be less than 500 characters')
      .trim()
      .optional(),

    issue: z
      .enum(MONTHS, {
        message: 'Issue must be a valid month name'
      })
      .optional(),

    volume: z
      .string()
      .regex(/^\d{4}$/, 'Volume must be a 4-digit year')
      .refine(
        (year) => {
          const yearNum = parseInt(year);
          return yearNum >= MIN_YEAR && yearNum <= MAX_YEAR;
        },
        {
          message: `Volume must be between ${MIN_YEAR} and ${MAX_YEAR}`
        }
      )
      .optional(),

    isVisible: z
      .boolean()
      .optional()
  }) // .partial() // Removed strict structure for updates if partial updates are allowed
});

export const adminPdfQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .regex(/^\d+$/, 'Page must be a positive number')
      .transform(Number)
      .refine(n => n > 0, 'Page must be greater than 0')
      .optional()
      .default(1),

    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a positive number')
      .transform(Number)
      .refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100')
      .optional()
      .default(10),

    search: z
      .string()
      .max(100, 'Search term must be less than 100 characters')
      .trim()
      .optional(),

    volume: z
      .string()
      .regex(/^\d{4}$/, 'Volume must be a 4-digit year')
      .optional(),

    issue: z
      .enum(MONTHS)
      .optional(),

    isVisible: z
      .string()
      .transform(val => val === 'true')
      .optional(),

    sortBy: z
      .enum(['uploadedAt', 'title', 'volume', 'issue'])
      .optional()
      .default('uploadedAt'),

    sortOrder: z
      .enum(['asc', 'desc'])
      .optional()
      .default('desc')
  })
});

export const adminPdfIdSchema = z.object({
  params: z.object({
    id: z
      .string()
      .min(1, 'PDF ID is required')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid PDF ID format')
  })
});

// Export types for use in controllers
export type AdminPdfUploadInput = z.infer<typeof adminPdfUploadSchema>['body'];
export type AdminPdfUpdateInput = z.infer<typeof adminPdfUpdateSchema>['body'];
export type AdminPdfQueryInput = z.infer<typeof adminPdfQuerySchema>['query'];
export type AdminPdfIdInput = z.infer<typeof adminPdfIdSchema>['params'];