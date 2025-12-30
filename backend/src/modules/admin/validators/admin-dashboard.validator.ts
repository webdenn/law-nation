import { z } from "zod";
import { ArticleStatus } from "@prisma/client";

// Validate timeline query parameters
export const timelineQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(ArticleStatus).optional(),
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
