import { prisma } from "@/db/db.js";
import { sendArticleUploadNotificationToAdmin } from "./email.utils.js";

/**
 * Send article upload notification to all admin users
 */
export async function notifyAdminsOfArticleUpload(
  uploaderName: string,
  uploaderEmail: string,
  articleTitle: string,
  articleId: string,
  category?: string,
  organization?: string
): Promise<void> {
  try {
    console.log(`📧 [Admin Notification] Notifying admins of new article upload: ${articleTitle}`);

    // Get all users with admin role
    const adminUsers = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: 'admin'
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (adminUsers.length === 0) {
      console.warn(`⚠️ [Admin Notification] No admin users found to notify`);
      return;
    }

    console.log(`📧 [Admin Notification] Found ${adminUsers.length} admin users to notify`);

    // Send notification to each admin
    const notificationPromises = adminUsers.map(admin => 
      sendArticleUploadNotificationToAdmin(
        admin.email,
        admin.name || 'Admin',
        uploaderName,
        uploaderEmail,
        articleTitle,
        articleId,
        category,
        organization
      )
    );

    await Promise.all(notificationPromises);

    console.log(`✅ [Admin Notification] Successfully notified ${adminUsers.length} admins of article upload`);

  } catch (error) {
    console.error(`❌ [Admin Notification] Failed to notify admins of article upload:`, error);
    // Don't throw - this is a non-critical notification
  }
}

/**
 * Send article upload notification to specific admin
 */
export async function notifySpecificAdminOfArticleUpload(
  adminId: string,
  uploaderName: string,
  uploaderEmail: string,
  articleTitle: string,
  articleId: string,
  category?: string,
  organization?: string
): Promise<void> {
  try {
    console.log(`📧 [Admin Notification] Notifying specific admin ${adminId} of article upload: ${articleTitle}`);

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        email: true,
        roles: {
          select: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!admin) {
      console.warn(`⚠️ [Admin Notification] Admin user ${adminId} not found`);
      return;
    }

    const isAdmin = admin.roles.some(userRole => userRole.role.name === 'admin');
    if (!isAdmin) {
      console.warn(`⚠️ [Admin Notification] User ${adminId} is not an admin`);
      return;
    }

    await sendArticleUploadNotificationToAdmin(
      admin.email,
      admin.name || 'Admin',
      uploaderName,
      uploaderEmail,
      articleTitle,
      articleId,
      category,
      organization
    );

    console.log(`✅ [Admin Notification] Successfully notified admin ${admin.name} of article upload`);

  } catch (error) {
    console.error(`❌ [Admin Notification] Failed to notify admin ${adminId} of article upload:`, error);
    // Don't throw - this is a non-critical notification
  }
}