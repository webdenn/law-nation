import type { Response } from "express";
import type { AuthRequest } from "@/types/auth-request.js";
import { notificationService } from "./notification.service.js";
import { getNotificationsQuerySchema, notificationIdParamSchema } from "./validators/notification.validator.js";

export class NotificationController {
  /**
   * Get all notifications for current user
   */
  async getNotifications(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const validatedQuery = getNotificationsQuerySchema.parse(req.query);

    const result = await notificationService.getUserNotifications(
      userId,
      validatedQuery.page,
      validatedQuery.limit
    );

    res.json(result);
  }

  /**
   * Get unread notifications
   */
  async getUnreadNotifications(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const result = await notificationService.getUnreadNotifications(userId);
    res.json(result);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { id } = notificationIdParamSchema.parse(req.params);

    const notification = await notificationService.markAsRead(id, userId);

    res.json({
      message: "Notification marked as read",
      notification,
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const result = await notificationService.markAllAsRead(userId);
    res.json(result);
  }

  /**
   * Delete notification
   */
  async deleteNotification(req: AuthRequest, res: Response) {
    const userId = req.user!.id;
    const { id } = notificationIdParamSchema.parse(req.params);

    const result = await notificationService.deleteNotification(id, userId);
    res.json(result);
  }
}

export const notificationController = new NotificationController();
