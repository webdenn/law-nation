import { Router } from "express";
import {
  signupHandler,
  loginHandler,
  refreshHandler,
  meHandler,
  logoutHandler,
} from "./auth.controller.js";
import { requireAuth } from "@/middlewares/auth.middleware.js";

// /src/modules/auth/auth.routes.ts
export const AuthRouter: Router = Router();

AuthRouter.post("/signup", signupHandler);
AuthRouter.post("/login", loginHandler);
AuthRouter.post("/refresh", refreshHandler);
AuthRouter.get("/me", requireAuth, meHandler);
AuthRouter.post("/logout", logoutHandler);

export default AuthRouter;
