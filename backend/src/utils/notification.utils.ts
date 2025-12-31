import { prisma } from "@/db/db.js";
import { sendEditorApprovalNotificationToAdmin, sendArticlePublishedNotification } from "@/utils/email.utils.js";

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
export async function createNotification(data: CreateNotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        ...(data.articleId && { articleId: data.articleId }),
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata || {},
        isRead: false,
      },
    });

    console.log(`🔔 [Notification] Created for user ${data.userId}: ${data.title}`);
    return notification;
  } catch (error) {
    console.error("❌ [Notification] Failed to create:", error);
    throw error;
  }
}

/**
 * Notify admin when editor approves an article
 * Sends BOTH in-app notification AND email
 */
export async function notifyAdminOfEditorApproval(
  articleId: string,
  articleTitle: string,
  editorName: string
) {
  try {
    // Find all admin users
    const admins = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: "admin",
            },
          },
        },
        isActive: true,
      },
    });

    console.log(`🔔 [Notification] Notifying ${admins.length} admin(s) about editor approval`);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const changeHistoryUrl = `${frontendUrl}/articles/${articleId}/change-history`;

    // Create in-app notification + send email for each admin
    const notifications = await Promise.all(
      admins.map(async (admin) => {
        // 1. Create in-app notification
        const notification = await createNotification({
          userId: admin.id,
          articleId,
          type: "ARTICLE_APPROVED_BY_EDITOR",
          title: "Article Ready for Publishing",
          message: `Editor ${editorName} has approved article "${articleTitle}". You can now publish it.`,
          metadata: {
            articleTitle,
            editorName,
            articleId,
            changeHistoryUrl,
          },
        });

        // 2. Send email notification
        try {
          await sendEditorApprovalNotificationToAdmin(
            admin.email,
            admin.name,
            articleTitle,
            editorName,
            articleId
          );
          console.log(`📧 [Email] Sent editor approval notification to ${admin.email}`);
        } catch (emailError) {
          console.error(`❌ [Email] Failed to send to ${admin.email}:`, emailError);
          // Don't throw - in-app notification still created
        }

        return notification;
      })
    );

    return notifications;
  } catch (error) {
    console.error("❌ [Notification] Failed to notify admins:", error);
    throw error;
  }
}

/**
 * Notify uploader when article is published (with link to change history)
 * Sends BOTH in-app notification AND email
 */
export async function notifyUploaderOfPublication(
  articleId: string,
  articleTitle: string,
  uploaderEmail: string,
  uploaderName: string,
  diffSummary?: string
) {
  try {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const changeHistoryUrl = `${frontendUrl}/articles/${articleId}/change-history`;
    const articleUrl = `${frontendUrl}/articles/${articleId}`;

    // Find uploader by email (they might not be a registered user)
    const user = await prisma.user.findUnique({
      where: { email: uploaderEmail },
    });

    // 1. If uploader is a registered user, create in-app notification
    if (user) {
      await createNotification({
        userId: user.id,
        articleId,
        type: "ARTICLE_PUBLISHED",
        title: "Your Article Has Been Published",
        message: `Your article "${articleTitle}" has been published. View changes and read your article.`,
        metadata: {
          articleTitle,
          articleId,
          changeHistoryUrl,
          articleUrl,
        },
      });
      console.log(`🔔 [Notification] Created in-app notification for ${uploaderName}`);
    }

    // 2. Send email notification with diff summary (always, even if not registered user)
    try {
      await sendArticlePublishedNotification(
        uploaderEmail,
        uploaderName,
        articleTitle,
        articleId,
        diffSummary  // Pass diff summary to email
      );
      console.log(`📧 [Email] Sent publication notification to ${uploaderEmail}`);
      if (diffSummary) {
        console.log(`📊 [Email] Included diff summary: ${diffSummary}`);
      }
    } catch (emailError) {
      console.error(`❌ [Email] Failed to send to ${uploaderEmail}:`, emailError);
      // Don't throw - this is not critical
    }

    console.log(`✅ [Notification] Notified uploader ${uploaderName} about publication`);
  } catch (error) {
    console.error("❌ [Notification] Failed to notify uploader:", error);
    // Don't throw - this is not critical
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string) {
  return await prisma.notification.findMany({
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
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  return await prisma.notification.update({
    where: {
      id: notificationId,
      userId, // Ensure user owns this notification
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  return await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

/**
 * Get all notifications for a user (with pagination)
 */
export async function getUserNotifications(
  userId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
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
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
