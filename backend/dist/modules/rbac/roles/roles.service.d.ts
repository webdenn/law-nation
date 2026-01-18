export declare const RoleService: {
    createRole: typeof createRole;
    getRoleById: typeof getRoleById;
    listRoles: typeof listRoles;
    updateRole: typeof updateRole;
    deleteRole: typeof deleteRole;
    assignPermission: typeof assignPermission;
    removePermission: typeof removePermission;
    getRolePermissions: typeof getRolePermissions;
    assignRoleToUser: typeof assignRoleToUser;
    removeRoleFromUser: typeof removeRoleFromUser;
};
export default RoleService;
declare function createRole(data: {
    name: string;
    description?: string | null;
}): Promise<{
    id: string;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    description: string | null;
}>;
declare function getRoleById(id: string): Promise<({
    permissions: ({
        permission: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            key: string;
            module: string | null;
        };
    } & {
        roleId: string;
        assignedAt: Date;
        permissionId: string;
    })[];
    users: ({
        user: {
            id: string;
            createdAt: Date;
            name: string;
            email: string;
            phone: string | null;
            passwordHash: string;
            isActive: boolean;
            updatedAt: Date;
            version: number;
        };
    } & {
        userId: string;
        roleId: string;
        assignedAt: Date;
    })[];
} & {
    id: string;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    description: string | null;
}) | null>;
declare function listRoles(): Promise<({
    permissions: ({
        permission: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            key: string;
            module: string | null;
        };
    } & {
        roleId: string;
        assignedAt: Date;
        permissionId: string;
    })[];
} & {
    id: string;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    description: string | null;
})[]>;
declare function updateRole(id: string, patch: {
    name?: string | undefined;
    description?: string | undefined;
}): Promise<{
    id: string;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    description: string | null;
}>;
declare function deleteRole(id: string): Promise<{
    id: string;
    createdAt: Date;
    name: string;
    updatedAt: Date;
    description: string | null;
}>;
declare function assignPermission(roleId: string, permissionId: string): Promise<{
    roleId: string;
    assignedAt: Date;
    permissionId: string;
}>;
declare function removePermission(roleId: string, permissionId: string): Promise<{
    roleId: string;
    assignedAt: Date;
    permissionId: string;
}>;
declare function getRolePermissions(roleId: string): Promise<({
    permission: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        key: string;
        module: string | null;
    };
} & {
    roleId: string;
    assignedAt: Date;
    permissionId: string;
})[]>;
declare function assignRoleToUser(userId: string, roleId: string): Promise<{
    userId: string;
    roleId: string;
    assignedAt: Date;
}>;
declare function removeRoleFromUser(userId: string, roleId: string): Promise<{
    userId: string;
    roleId: string;
    assignedAt: Date;
}>;
//# sourceMappingURL=roles.service.d.ts.map