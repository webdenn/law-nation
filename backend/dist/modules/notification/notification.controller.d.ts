import type { Response } from "express";
import type { AuthRequest } from "@/types/auth-request.js";
export declare class NotificationController {
    /**
     * Get all notifications for current user
     */
    getNotifications(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Get unread notifications
     */
    getUnreadNotifications(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Mark notification as read
     */
    markAsRead(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Mark all notifications as read
     */
    markAllAsRead(req: AuthRequest, res: Response): Promise<void>;
    /**
     * Delete notification
     */
    deleteNotification(req: AuthRequest, res: Response): Promise<void>;
}
export declare const notificationController: NotificationController;
//# sourceMappingURL=notification.controller.d.ts.map