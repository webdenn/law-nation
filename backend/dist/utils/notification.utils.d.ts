export interface CreateNotificationData {
    userId: string;
    articleId?: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, any>;
}
/**
 * Create a notification for a user
 */
export declare function createNotification(data: CreateNotificationData): Promise<{
    message: string;
    id: string;
    createdAt: Date;
    userId: string;
    metadata: import("@prisma/client/runtime/client").JsonValue | null;
    type: string;
    title: string;
    isRead: boolean;
    readAt: Date | null;
    articleId: string | null;
}>;
/**
 * Notify admin when editor approves an article
 * Sends BOTH in-app notification AND email
 */
export declare function notifyAdminOfEditorApproval(articleId: string, articleTitle: string, editorName: string): Promise<{
    message: string;
    id: string;
    createdAt: Date;
    userId: string;
    metadata: import("@prisma/client/runtime/client").JsonValue | null;
    type: string;
    title: string;
    isRead: boolean;
    readAt: Date | null;
    articleId: string | null;
}[]>;
/**
 * Notify uploader when article is published (with link to change history)
 * Sends BOTH in-app notification AND email
 */
export declare function notifyUploaderOfPublication(articleId: string, articleTitle: string, uploaderEmail: string, uploaderName: string, diffSummary?: string): Promise<void>;
/**
 * Get unread notifications for a user
 */
export declare function getUnreadNotifications(userId: string): Promise<({
    article: {
        id: string;
        title: string;
        status: import("@prisma/client").$Enums.ArticleStatus;
    } | null;
} & {
    message: string;
    id: string;
    createdAt: Date;
    userId: string;
    metadata: import("@prisma/client/runtime/client").JsonValue | null;
    type: string;
    title: string;
    isRead: boolean;
    readAt: Date | null;
    articleId: string | null;
})[]>;
/**
 * Mark notification as read
 */
export declare function markNotificationAsRead(notificationId: string, userId: string): Promise<{
    message: string;
    id: string;
    createdAt: Date;
    userId: string;
    metadata: import("@prisma/client/runtime/client").JsonValue | null;
    type: string;
    title: string;
    isRead: boolean;
    readAt: Date | null;
    articleId: string | null;
}>;
/**
 * Mark all notifications as read for a user
 */
export declare function markAllNotificationsAsRead(userId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
/**
 * Get all notifications for a user (with pagination)
 */
export declare function getUserNotifications(userId: string, page?: number, limit?: number): Promise<{
    notifications: ({
        article: {
            id: string;
            title: string;
            status: import("@prisma/client").$Enums.ArticleStatus;
        } | null;
    } & {
        message: string;
        id: string;
        createdAt: Date;
        userId: string;
        metadata: import("@prisma/client/runtime/client").JsonValue | null;
        type: string;
        title: string;
        isRead: boolean;
        readAt: Date | null;
        articleId: string | null;
    })[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
//# sourceMappingURL=notification.utils.d.ts.map