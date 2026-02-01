import { z } from "zod";
export declare const timelineQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    status: z.ZodOptional<z.ZodEnum<{
        PENDING_ADMIN_REVIEW: "PENDING_ADMIN_REVIEW";
        ASSIGNED_TO_EDITOR: "ASSIGNED_TO_EDITOR";
        EDITOR_EDITING: "EDITOR_EDITING";
        EDITOR_APPROVED: "EDITOR_APPROVED";
        PENDING_APPROVAL: "PENDING_APPROVAL";
        APPROVED: "APPROVED";
        REJECTED: "REJECTED";
        PUBLISHED: "PUBLISHED";
    }>>;
    startDate: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    endDate: z.ZodOptional<z.ZodCoercedDate<unknown>>;
}, z.core.$strip>;
export declare const metricsQuerySchema: z.ZodObject<{
    startDate: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    endDate: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    groupBy: z.ZodDefault<z.ZodEnum<{
        week: "week";
        day: "day";
        month: "month";
    }>>;
}, z.core.$strip>;
export type TimelineQuery = z.infer<typeof timelineQuerySchema>;
export type MetricsQuery = z.infer<typeof metricsQuerySchema>;
//# sourceMappingURL=admin-dashboard.validator.d.ts.map