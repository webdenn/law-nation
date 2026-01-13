import { Router } from "express";
import {
  signupHandler,
  loginHandler,
  adminLoginHandler,
  refreshHandler,
  meHandler,
  logoutHandler,
  sendOtpHandler,
  verifyOtpHandler,
  setupPasswordHandler,
} from "./auth.controller.js";
import { requireAuth } from "@/middlewares/auth.middleware.js";
import { validateRecaptcha } from "@/middlewares/recaptcha.middleware.js";

// /src/modules/auth/auth.routes.ts
export const AuthRouter: Router = Router();

AuthRouter.post("/signup", validateRecaptcha, signupHandler);
AuthRouter.post("/login", validateRecaptcha, loginHandler);
AuthRouter.post("/admin-login", validateRecaptcha, adminLoginHandler);
AuthRouter.post("/refresh", refreshHandler);
AuthRouter.get("/me", requireAuth, meHandler);
AuthRouter.post("/logout", logoutHandler);

// OTP verification routes
AuthRouter.post("/send-otp", sendOtpHandler);
AuthRouter.post("/verify-otp", verifyOtpHandler);

// Setup password route (for editor invitation)
AuthRouter.post("/setup-password", setupPasswordHandler);

export default AuthRouter;
