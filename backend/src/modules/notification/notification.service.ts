import { prisma } from "@/db/db.js";
import { NotFoundError, ForbiddenError } from "@/utils/http-errors.util.js";
import type {
  NotificationListResponse,
  UnreadNotificationsResponse,
  MarkAsReadResponse,
  MarkAllAsReadResponse,
  DeleteNotificationResponse,
} from "./types/notification.type.js";

export class NotificationService {
  /**
   * Get all notifications for a user
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<NotificationListResponse> {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          article: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string): Promise<UnreadNotificationsResponse> {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    return {
      notifications,
      count: notifications.length,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<MarkAsReadResponse> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    if (notification.userId !== userId) {
      throw new ForbiddenError("You do not have permission to update this notification");
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      message: "Notification marked as read",
      notification: updatedNotification,
    };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<MarkAllAsReadResponse> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      message: "All notifications marked as read",
      count: result.count,
    };
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<DeleteNotificationResponse> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    if (notification.userId !== userId) {
      throw new ForbiddenError("You do not have permission to delete this notification");
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return {
      message: "Notification deleted successfully",
    };
  }
}

export const notificationService = new NotificationService();
