import type { NotificationListResponse, UnreadNotificationsResponse, MarkAsReadResponse, MarkAllAsReadResponse, DeleteNotificationResponse } from "./types/notification.type.js";
export declare class NotificationService {
    /**
     * Get all notifications for a user
     */
    getUserNotifications(userId: string, page?: number, limit?: number): Promise<NotificationListResponse>;
    /**
     * Get unread notifications for a user
     */
    getUnreadNotifications(userId: string): Promise<UnreadNotificationsResponse>;
    /**
     * Mark notification as read
     */
    markAsRead(notificationId: string, userId: string): Promise<MarkAsReadResponse>;
    /**
     * Mark all notifications as read
     */
    markAllAsRead(userId: string): Promise<MarkAllAsReadResponse>;
    /**
     * Delete notification
     */
    deleteNotification(notificationId: string, userId: string): Promise<DeleteNotificationResponse>;
}
export declare const notificationService: NotificationService;
//# sourceMappingURL=notification.service.d.ts.map