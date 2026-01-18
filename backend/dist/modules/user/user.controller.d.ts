import type { NextFunction, Response } from "express";
import type { AuthRequest } from "@/types/auth-request.js";
export declare const UserController: {
    createUserHandler: typeof createUserHandler;
    listUsersHandler: typeof listUsersHandler;
    findUserByIdHandler: typeof findUserByIdHandler;
    inviteEditorHandler: typeof inviteEditorHandler;
    listEditorsHandler: typeof listEditorsHandler;
};
export default UserController;
declare function createUserHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
declare function listUsersHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
declare function findUserByIdHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
declare function inviteEditorHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
declare function listEditorsHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=user.controller.d.ts.map