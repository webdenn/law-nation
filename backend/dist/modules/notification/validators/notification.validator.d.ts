import { z } from "zod";
/**
 * Query params for getting notifications
 */
export declare const getNotificationsQuerySchema: z.ZodObject<{
    page: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
    limit: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
}, z.core.$strip>;
export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>;
/**
 * Params for marking notification as read
 */
export declare const notificationIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>;
//# sourceMappingURL=notification.validator.d.ts.map