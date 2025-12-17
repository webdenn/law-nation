import { prisma } from "@/db/db.js";
import type { Prisma } from "@prisma/client";

// src/modules/rbac/permissions/permission.service.ts

// Exports
export const PermissionService = {
  createPermission,
  getPermissionById,
  listPermissions,
  updatePermission,
  deletePermission,
  // other service methods can be added here
};

export default PermissionService;

// Service Functions Implementations
async function createPermission(data: {
  key: string;
  description?: string | undefined;
  module?: string | undefined;
}) {
  // normalize key to lowercase
  const key = data.key.toLowerCase();
  return prisma.permission.create({
    data: {
      key,
      description: data.description ?? null,
      module: data.module ?? null,
    },
  });
}

async function getPermissionById(id: string) {
  return prisma.permission.findUnique({ where: { id } });
}

async function listPermissions() {
  return prisma.permission.findMany({ orderBy: { key: "asc" } });
}
async function updatePermission(
  id: string,
  patch: {
    key?: string | undefined;
    description?: string | undefined;
    module?: string | undefined;
  }
) {
  // Build a data object that only includes provided fields to satisfy Prisma's strict types.
  const updateData: Prisma.PermissionUpdateInput =
    {} as Prisma.PermissionUpdateInput;

  if (patch.key !== undefined) {
    updateData.key = patch.key.toLowerCase();
  }

  if (patch.description !== undefined) {
    // allow explicit null to clear the field
    updateData.description = patch.description as string | null;
  }

  if (patch.module !== undefined) {
    // allow explicit null to clear the field
    updateData.module = patch.module as string | null;
  }

  return prisma.permission.update({ where: { id }, data: updateData });
}

async function deletePermission(id: string) {
  // Might want to prevent delete if assigned to roles — business decision
  const assigned = await prisma.rolePermission.findFirst({
    where: { permissionId: id },
  });
  if (assigned) {
    throw new Error("Permission assigned to roles. Revoke before deleting.");
  }
  return prisma.permission.delete({ where: { id } });
}
