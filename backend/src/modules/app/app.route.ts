import { Router } from "express";
import { requireAuth } from "@/middlewares/auth.middleware.js";
import AuthRouter from "@/modules/auth/auth.routes.js";
import UserRouter from "@/modules/user/user.route.js";
import RbacRouter from "@/modules/rbac/rbac.route.js";
import ArticleRouter from "@/modules/article/article.route.js";
import AdminDashboardRouter from "@/modules/admin/admin-dashboard.route.js";
import AdminEditorRouter from "@/modules/admin/admin-editor.route.js";
import AdminReviewerRouter from "@/modules/admin/admin-reviewer.route.js";
import AuditRouter from "@/modules/audit/audit.route.js";
import NotificationRouter from "@/modules/notification/notification.route.js";
import BannerRouter from "@/modules/banners/banner.routes.js";
import SettingsRouter from "@/modules/settings/settings.routes.js";

// /src/modules/app/app.route.ts

// wrapped in /api in app.ts
export const AppRouter: Router = Router();

AppRouter.use("/auth", AuthRouter);
AppRouter.use("/users", requireAuth, UserRouter);
AppRouter.use("/rbac", requireAuth, RbacRouter);
AppRouter.use("/articles", ArticleRouter);
AppRouter.use("/admin/dashboard", AdminDashboardRouter);
AppRouter.use("/admin/editors", AdminEditorRouter);
AppRouter.use("/admin/reviewers", AdminReviewerRouter);
AppRouter.use("/audit", AuditRouter);
AppRouter.use("/notifications", NotificationRouter);
AppRouter.use("/banners", BannerRouter);
AppRouter.use("/settings", SettingsRouter);

// Health check
AppRouter.get("/health", (_req, res) => {
  res.json({ message: "Welcome to the  LAW NATION Backend API" });
});

export default AppRouter;
