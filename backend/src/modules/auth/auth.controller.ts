import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "./auth.service.js";
import { type AuthRequest } from "@/types/auth-request.js";
import { sendAuthNotification } from "@/utils/email.utils.js"; 
import {
  loginSchema,
  signupSchema,
  refreshSchema,
  logoutSchema,
  sendOtpSchema,
  verifyOtpSchema,
  setupPasswordSchema,
} from "./validators/auth.validator.js";
import { UnauthorizedError } from "@/utils/http-errors.util.js";

// --- SIGNUP HANDLER (Naya Registration) ---
export async function signupHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = signupSchema.parse(req.body);
    const result = await AuthService.signup(data);
    sendAuthNotification(data.email, data.name); 
    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: z.treeifyError(err) });
    }
    next(err);
  }
}

// --- LOGIN HANDLER (Signin) ---
export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await AuthService.login(data.email, data.password, res, false);
    return res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: z.treeifyError(err) });
    }
    next(err);
  }
}

export async function adminLoginHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = loginSchema.parse(req.body);
    // Pass true to require admin/editor access
    const result = await AuthService.login(data.email, data.password, res, true);
    return res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: z.treeifyError(err) });
    }

    
    next(err);
  }
}

// --- REFRESH HANDLER ---
export async function refreshHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tokenSource = req.cookies?.refreshToken || req.body?.refreshToken;
    const data = refreshSchema.parse({ refreshToken: tokenSource });
    const result = await AuthService.refresh(data.refreshToken, res);
    return res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: z.treeifyError(err) });
    }
    next(err);
  }
}

// --- LOGOUT HANDLER ---
export async function logoutHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tokenSource = req.cookies?.refreshToken || req.body?.refreshToken;
    const data = logoutSchema.parse({ refreshToken: tokenSource });
    const result = await AuthService.logout(data.refreshToken, res);
    return res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: z.treeifyError(err) });
    }
    next(err);
  }
}

// --- ME HANDLER (Current User) ---
export async function meHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id)
      throw new UnauthorizedError("user ID missing in request");
    const result = await AuthService.getCurrentUser(req.user.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// OTP handlers
export async function sendOtpHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = sendOtpSchema.parse(req.body);
    const result = await AuthService.sendVerificationOtp(data.email);
    return res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: z.treeifyError(err) });
    }
    next(err);
  }
}

export async function verifyOtpHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = verifyOtpSchema.parse(req.body);
    const result = await AuthService.verifyOtp(data.email, data.otp);
    return res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: z.treeifyError(err) });
    }
    next(err);
  }
}

// Setup password handler (for editor invitation)
export async function setupPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = setupPasswordSchema.parse(req.body);
    const result = await AuthService.setupPassword(data.token, data.password);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: z.treeifyError(err) });
    }
    next(err);
  }
}
