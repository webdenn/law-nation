import { prisma } from "@/db/db.js";
// src/modules/rbac/roles/role.service.ts
// Exports
export const RoleService = {
    createRole,
    getRoleById,
    listRoles,
    updateRole,
    deleteRole,
    assignPermission,
    removePermission,
    getRolePermissions,
    assignRoleToUser,
    removeRoleFromUser,
    // ... other methods as needed
};
export default RoleService;
// Service function implementations
async function createRole(data) {
    return prisma.role.create({ data });
}
async function getRoleById(id) {
    return prisma.role.findUnique({
        where: { id },
        include: {
            permissions: { include: { permission: true } },
            users: { include: { user: true } }, // if you want users
        },
    });
}
async function listRoles() {
    return prisma.role.findMany({
        include: { permissions: { include: { permission: true } } },
        orderBy: { name: "asc" },
    });
}
async function updateRole(id, patch) {
    const data = {};
    if (patch.name !== undefined) {
        data.name = { set: patch.name };
    }
    if (patch.description !== undefined) {
        data.description = { set: patch.description };
    }
    return prisma.role.update({ where: { id }, data });
}
async function deleteRole(id) {
    // You might want to check if the role is assigned to users and disallow delete
    const assigned = await prisma.userRole.findFirst({ where: { roleId: id } });
    if (assigned) {
        throw new Error("Role is assigned to users. Unassign before deleting.");
    }
    return prisma.role.delete({ where: { id } });
}
// Permission assignments
async function assignPermission(roleId, permissionId) {
    return prisma.rolePermission.create({ data: { roleId, permissionId } });
}
async function removePermission(roleId, permissionId) {
    return prisma.rolePermission.delete({
        where: { roleId_permissionId: { roleId, permissionId } },
    });
}
async function getRolePermissions(roleId) {
    return prisma.rolePermission.findMany({
        where: { roleId },
        include: { permission: true },
    });
}
// User-role assignment (helper)
async function assignRoleToUser(userId, roleId) {
    return prisma.userRole.create({ data: { userId, roleId } });
}
async function removeRoleFromUser(userId, roleId) {
    return prisma.userRole.delete({
        where: { userId_roleId: { userId, roleId } },
    });
}
//# sourceMappingURL=roles.service.js.map