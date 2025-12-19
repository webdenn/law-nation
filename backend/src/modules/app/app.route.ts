import { Router } from "express";
import { requireAuth } from "@/middlewares/auth.middleware.js";
import AuthRouter from "@/modules/auth/auth.routes.js";
import UserRouter from "@/modules/user/user.route.js";
import RbacRouter from "@/modules/rbac/rbac.route.js";
import ArticleRouter from "@/modules/article/article.route.js";

// /src/modules/app/app.route.ts

// wrapped in /api in app.ts
export const AppRouter: Router = Router();

AppRouter.use("/auth", AuthRouter);
AppRouter.use("/users", requireAuth, UserRouter);
AppRouter.use("/rbac", requireAuth, RbacRouter);
AppRouter.use("/articles", ArticleRouter);

// Health check
AppRouter.get("/health", (_req, res) => {
  res.json({ message: "Welcome to the CRM Backend API" });
});

export default AppRouter;
