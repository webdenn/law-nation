export interface NotificationResponse {
  id: string;
  userId: string;
  articleId: string | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  readAt: Date | null;
  metadata: any;
  article?: {
    id: string;
    title: string;
    status: string;
  } | null;
}

export interface NotificationListResponse {
  notifications: NotificationResponse[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UnreadNotificationsResponse {
  notifications: NotificationResponse[];
  count: number;
}

export interface MarkAsReadResponse {
  message: string;
  notification: NotificationResponse;
}

export interface MarkAllAsReadResponse {
  message: string;
  count: number;
}

export interface DeleteNotificationResponse {
  message: string;
}
