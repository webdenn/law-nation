import type { Response } from "express";
import type { AuthRequest } from "@/types/auth-request.js";
export declare const RoleController: {
    create: typeof create;
    list: typeof list;
    get: typeof get;
    update: typeof update;
    remove: typeof remove;
    assignPermission: typeof assignPermission;
    removePermission: typeof removePermission;
    getPermissions: typeof getPermissions;
    assignRoleToUser: typeof assignRoleToUser;
    removeRoleFromUser: typeof removeRoleFromUser;
};
export default RoleController;
declare function create(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
declare function list(_req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
declare function get(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
declare function update(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
declare function remove(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
declare function assignPermission(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
declare function removePermission(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
declare function getPermissions(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
declare function assignRoleToUser(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
declare function removeRoleFromUser(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=roles.controller.d.ts.map