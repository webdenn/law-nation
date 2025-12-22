import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { UserService } from "./user.service.js";
import { createUserSchema, inviteEditorSchema } from "@/modules/user/validators/user.validator.js";
import type { AuthRequest } from "@/types/auth-request.js";
import {
  BadRequestError,
  UnauthorizedError,
} from "@/utils/http-errors.util.js";

// /src/modules/user/user.controller.ts

// Exported UserController object
export const UserController = {
  createUserHandler,
  listUsersHandler,
  findUserByIdHandler,
  inviteEditorHandler,
  // add more handlers as needed
};

export default UserController;

// Controller Function Implementations

async function createUserHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data = createUserSchema.parse(req.body);
    const currentUser = req.user; // middleware sets authenticated user object
    if (!currentUser) {
      throw new UnauthorizedError("Authenticated user not found");
    }
    const result = await UserService.createUser(data, currentUser);
    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: z.treeifyError(err) });
    }
    next(err);
  }
}

async function listUsersHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const currentUser = req.user; // middleware sets authenticated user object
    if (!currentUser)
      throw new UnauthorizedError("Authenticated user not found");
    const result = await UserService.listUsers(currentUser);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function findUserByIdHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    if (!id) throw new BadRequestError("User ID is required");
    const currentUser = req.user; // middleware sets authenticated user object
    if (!currentUser)
      throw new UnauthorizedError("Authenticated user not found");
    const result = await UserService.findUserById(id, currentUser);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function inviteEditorHandler(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const data = inviteEditorSchema.parse(req.body);
    const currentUser = req.user;
    if (!currentUser) {
      throw new UnauthorizedError("Authenticated user not found");
    }
    const result = await UserService.inviteEditor(data, currentUser);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: z.treeifyError(err) });
    }
    next(err);
  }
}
