export declare const PermissionService: {
    createPermission: typeof createPermission;
    getPermissionById: typeof getPermissionById;
    listPermissions: typeof listPermissions;
    updatePermission: typeof updatePermission;
    deletePermission: typeof deletePermission;
};
export default PermissionService;
declare function createPermission(data: {
    key: string;
    description?: string | undefined;
    module?: string | undefined;
}): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    key: string;
    module: string | null;
}>;
declare function getPermissionById(id: string): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    key: string;
    module: string | null;
} | null>;
declare function listPermissions(): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    key: string;
    module: string | null;
}[]>;
declare function updatePermission(id: string, patch: {
    key?: string | undefined;
    description?: string | undefined;
    module?: string | undefined;
}): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    key: string;
    module: string | null;
}>;
declare function deletePermission(id: string): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string | null;
    key: string;
    module: string | null;
}>;
//# sourceMappingURL=permissions.service.d.ts.map