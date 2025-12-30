import { Router } from "express";
import { requireAuth } from "@/middlewares/auth.middleware.js";
import { notificationController } from "./notification.controller.js";

const router = Router();

// All notification routes require authentication
router.use(requireAuth);

// Get all notifications for current user
router.get(
  "/",
  notificationController.getNotifications.bind(notificationController)
);

// Get unread notifications
router.get(
  "/unread",
  notificationController.getUnreadNotifications.bind(notificationController)
);

// Mark all notifications as read
router.patch(
  "/mark-all-read",
  notificationController.markAllAsRead.bind(notificationController)
);

// Mark specific notification as read
router.patch(
  "/:id/read",
  notificationController.markAsRead.bind(notificationController)
);

// Delete notification
router.delete(
  "/:id",
  notificationController.deleteNotification.bind(notificationController)
);

export default router;
