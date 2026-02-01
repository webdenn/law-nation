import type { Response } from "express";
import { RoleService } from "./roles.service.js";
import type { AuthRequest } from "@/types/auth-request.js";
import {
  roleCreateSchema,
  roleUpdateSchema,
  assignPermissionSchema,
  assignRoleToUserSchema,
} from "./validators/roles.validator.js";

// Exports
export const RoleController = {
  create,
  list,
  get,
  update,
  remove,
  assignPermission,
  removePermission,
  getPermissions,
  assignRoleToUser,
  removeRoleFromUser,
};

export default RoleController;

function getString(param: string | string[] | undefined): string {
  if (!param || Array.isArray(param)) throw new Error("Invalid string parameter");
  return param;
}

// Controller Functions Implementations
async function create(req: AuthRequest, res: Response) {
  try {
    const payload = roleCreateSchema.parse(req.body);
    const role = await RoleService.createRole({
      ...payload,
      description:
        payload.description === undefined ? null : payload.description,
    });
    return res.status(201).json(role);
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    return res.status(400).json({ error: err.message ?? "Bad Request" });
  }
}

async function list(_req: AuthRequest, res: Response) {
  const roles = await RoleService.listRoles();
  return res.json(roles);
}

async function get(req: AuthRequest, res: Response) {
  const id = getString(req.params.id);
  const role = await RoleService.getRoleById(id);
  if (!role) return res.status(404).json({ error: "Not found" });
  return res.json(role);
}

async function update(req: AuthRequest, res: Response) {
  try {
    const id = getString(req.params.id);
    const payload = roleUpdateSchema.parse(req.body);
    const role = await RoleService.updateRole(id, payload);
    return res.json(role);
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    return res.status(400).json({ error: err.message ?? "Bad Request" });
  }
}

async function remove(req: AuthRequest, res: Response) {
  try {
    const id = getString(req.params.id);
    await RoleService.deleteRole(id);
    return res.status(204).send();
  } catch (err: any) {
    return res.status(400).json({ error: err.message ?? "Bad Request" });
  }
}

// Permissions
async function assignPermission(req: AuthRequest, res: Response) {
  try {
    const roleId = getString(req.params.id);
    const { permissionId } = assignPermissionSchema.parse(req.body);
    const rp = await RoleService.assignPermission(roleId, permissionId);
    return res.status(201).json(rp);
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    return res.status(400).json({ error: err.message ?? "Bad Request" });
  }
}

async function removePermission(req: AuthRequest, res: Response) {
  try {
    const roleId = getString(req.params.id);
    const permId = getString(req.params.permId);
    const rp = await RoleService.removePermission(roleId, permId);
    return res.json(rp);
  } catch (err: any) {
    return res.status(400).json({ error: err.message ?? "Bad Request" });
  }
}

async function getPermissions(req: AuthRequest, res: Response) {
  const id = getString(req.params.id);
  const perms = await RoleService.getRolePermissions(id);
  return res.json(perms);
}

// User-role
async function assignRoleToUser(req: AuthRequest, res: Response) {
  try {
    const payload = assignRoleToUserSchema.parse({
      ...req.body,
      roleId: req.body.roleId,
    });
    const ur = await RoleService.assignRoleToUser(
      payload.userId,
      payload.roleId
    );
    return res.status(201).json(ur);
  } catch (err: any) {
    if (err?.issues) return res.status(400).json({ error: err.issues });
    return res.status(400).json({ error: err.message ?? "Bad Request" });
  }
}

async function removeRoleFromUser(req: AuthRequest, res: Response) {
  try {
    const userId = getString(req.params.userId);
    const roleId = getString(req.params.roleId);
    const ur = await RoleService.removeRoleFromUser(userId, roleId);
    return res.json(ur);
  } catch (err: any) {
    return res.status(400).json({ error: err.message ?? "Bad Request" });
  }
}
