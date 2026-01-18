import { prisma } from "@/db/db.js";
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
async function createPermission(data) {
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
async function getPermissionById(id) {
    return prisma.permission.findUnique({ where: { id } });
}
async function listPermissions() {
    return prisma.permission.findMany({ orderBy: { key: "asc" } });
}
async function updatePermission(id, patch) {
    // Build a data object that only includes provided fields to satisfy Prisma's strict types.
    const updateData = {};
    if (patch.key !== undefined) {
        updateData.key = patch.key.toLowerCase();
    }
    if (patch.description !== undefined) {
        // allow explicit null to clear the field
        updateData.description = patch.description;
    }
    if (patch.module !== undefined) {
        // allow explicit null to clear the field
        updateData.module = patch.module;
    }
    return prisma.permission.update({ where: { id }, data: updateData });
}
async function deletePermission(id) {
    // Might want to prevent delete if assigned to roles — business decision
    const assigned = await prisma.rolePermission.findFirst({
        where: { permissionId: id },
    });
    if (assigned) {
        throw new Error("Permission assigned to roles. Revoke before deleting.");
    }
    return prisma.permission.delete({ where: { id } });
}
//# sourceMappingURL=permissions.service.js.map