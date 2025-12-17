import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "./auth.service.js";
import { type AuthRequest } from "@/types/auth-request.js";
import {
  loginSchema,
  refreshSchema,
  logoutSchema,
} from "./validators/auth.validator.js";
import { UnauthorizedError } from "@/utils/http-errors.util.js";

// /src/controllers/auth.controller.ts
export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await AuthService.login(data.email, data.password, res);
    return res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: z.treeifyError(err) });
    }
    next(err);
  }
}

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
