import { z } from "zod";
/**
 * Query params for getting notifications
 */
export const getNotificationsQuerySchema = z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
});
/**
 * Params for marking notification as read
 */
export const notificationIdParamSchema = z.object({
    id: z.string().min(1, "Notification ID is required"),
});
//# sourceMappingURL=notification.validator.js.map