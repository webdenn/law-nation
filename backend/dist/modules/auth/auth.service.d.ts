import type { Response } from "express";
export declare const AuthService: {
    signup: typeof signup;
    login: typeof login;
    refresh: typeof refresh;
    logout: typeof logout;
    getCurrentUser: typeof getCurrentUser;
    sendVerificationOtp: typeof sendVerificationOtp;
    verifyOtp: typeof verifyOtp;
    setupPassword: typeof setupPassword;
};
export default AuthService;
declare function signup(data: {
    name: string;
    email: string;
    password: string;
    phone?: string | undefined;
}): Promise<{
    message: string;
    user: {
        id: string;
        name: string;
        email: string;
    };
}>;
declare function login(email: string, password: string, res: Response, requireAdminAccess?: boolean): Promise<{
    accessToken: string;
    user: {
        id: string;
        name: string;
        email: string;
        roles: {
            id: string;
            name: string;
        }[];
    };
}>;
declare function refresh(refreshToken: string | undefined, res: Response): Promise<{
    accessToken: string;
    user: {
        id: string;
        name: string;
        email: string;
        roles: {
            id: string;
            name: string;
        }[];
    };
}>;
declare function logout(refreshToken: string | undefined, res: Response): Promise<{
    ok: boolean;
}>;
declare function getCurrentUser(userId: string): Promise<{
    user: {
        id: string;
        name: string;
        email: string;
        roles: {
            id: string;
            name: string;
        }[];
    };
}>;
declare function sendVerificationOtp(email: string): Promise<{
    success: boolean;
    message: string;
}>;
declare function verifyOtp(email: string, otp: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Setup password for invited editor
 * Verifies token, creates user with editor role, and sets password
 */
declare function setupPassword(token: string, password: string): Promise<{
    success: boolean;
    message: string;
    user: {
        id: string;
        name: string;
        email: string;
        roles: string[];
    };
}>;
//# sourceMappingURL=auth.service.d.ts.map