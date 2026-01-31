import { z } from 'zod';

// Content validation schema
export const aboutContentSchema = z.object({
  body: z.object({
    content: z
      .string()
      .min(1, 'Content is required')
      .max(50000, 'Content must be less than 50,000 characters')
      .trim()
  })
});

// Admin update schema
export const adminAboutUpdateSchema = z.object({
  body: z.object({
    content: z
      .string()
      .min(1, 'Content is required')
      .max(50000, 'Content must be less than 50,000 characters')
      .trim()
  })
});

// Preview schema
export const aboutPreviewSchema = z.object({
  body: z.object({
    content: z
      .string()
      .min(1, 'Content is required')
      .max(50000, 'Content must be less than 50,000 characters')
      .trim()
  })
});

// Export types for use in controllers
export type AboutContentInput = z.infer<typeof aboutContentSchema>;
export type AdminAboutUpdateInput = z.infer<typeof adminAboutUpdateSchema>;
export type AboutPreviewInput = z.infer<typeof aboutPreviewSchema>;