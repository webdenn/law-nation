import type { NextFunction, Response } from "express";
import { z } from "zod";
import { PermissionService } from "./permissions.service.js";
import type { AuthRequest } from "@/types/auth-request.js";
import {
  permissionCreateSchema,
  permissionUpdateSchema,
} from "./validators/permission.validator.js";
import { BadRequestError, NotFoundError } from "@/utils/http-errors.util.js";

// src/modules/rbac/permissions/permission.controller.ts

// Exports
export const PermissionController = {
  create,
  list,
  get,
  update,
  remove,
  // other controller methods can be added here
};

export default PermissionController;

// Controller Functions Implementations
async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payload = permissionCreateSchema.parse(req.body);
    const perm = await PermissionService.createPermission(payload);
    return res.status(201).json(perm);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: z.treeifyError(err) });
    }
    next(err);
  }
}

async function list(_req: AuthRequest, res: Response) {
  const perms = await PermissionService.listPermissions();
  return res.json(perms);
}

async function get(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!id) throw new BadRequestError("Permission ID is required");
    const perm = await PermissionService.getPermissionById(id);
    if (!perm) throw new NotFoundError("Permission not found");
    return res.json(perm);
  } catch (err) {
    next(err);
  }
}

async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const payload = permissionUpdateSchema.parse(req.body);
    if (!id) throw new BadRequestError("Permission ID is required");
    const perm = await PermissionService.updatePermission(id, payload);
    return res.json(perm);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: z.treeifyError(err) });
    }
    next(err);
  }
}

async function remove(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (!id) throw new BadRequestError("Permission ID is required");
    await PermissionService.deletePermission(id);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}
