import { z } from "zod";
import { ArticleStatus } from "@/db/db.js";

// Validate timeline query parameters
export const timelineQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum([
    ArticleStatus.PENDING_ADMIN_REVIEW,
    ArticleStatus.ASSIGNED_TO_EDITOR,
    ArticleStatus.EDITOR_EDITING,
    ArticleStatus.EDITOR_IN_PROGRESS,
    ArticleStatus.EDITOR_APPROVED,
    ArticleStatus.ASSIGNED_TO_REVIEWER,
    ArticleStatus.REVIEWER_EDITING,
    ArticleStatus.REVIEWER_IN_PROGRESS,
    ArticleStatus.REVIEWER_APPROVED,
    ArticleStatus.PENDING_APPROVAL,
    ArticleStatus.APPROVED,
    ArticleStatus.REJECTED,
    ArticleStatus.PUBLISHED
  ]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  {
    message: "Start date must be before or equal to end date",
    path: ["startDate"],
  }
);

// Validate date range for metrics
export const metricsQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('month'),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  {
    message: "Start date must be before or equal to end date",
    path: ["startDate"],
  }
);

// Export types
export type TimelineQuery = z.infer<typeof timelineQuerySchema>;
export type MetricsQuery = z.infer<typeof metricsQuerySchema>;
