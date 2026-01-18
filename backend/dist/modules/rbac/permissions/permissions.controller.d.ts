import type { NextFunction, Response } from "express";
import type { AuthRequest } from "@/types/auth-request.js";
export declare const PermissionController: {
    create: typeof create;
    list: typeof list;
    get: typeof get;
    update: typeof update;
    remove: typeof remove;
};
export default PermissionController;
declare function create(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
declare function list(_req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
declare function get(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
declare function update(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
declare function remove(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=permissions.controller.d.ts.map