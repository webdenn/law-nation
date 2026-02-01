import type { CreateUserData } from "./types/create-user-data.type.js";
import type { AuthUser } from "@/types/auth-request.js";
export declare const UserService: {
    createUser: typeof createUser;
    listUsers: typeof listUsers;
    findUserById: typeof findUserById;
    inviteEditor: typeof inviteEditor;
    listEditors: typeof listEditors;
};
export default UserService;
/**
 * Create a new user with one or more roles.
 */
declare function createUser(data: CreateUserData, currentUser?: AuthUser): Promise<{
    user: {
        id: string;
        name: string;
        email: string;
        roles: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            description: string | null;
        }[];
    };
}>;
/**
 * List users with their roles.
 */
declare function listUsers(currentUser?: AuthUser): Promise<{
    users: {
        id: string;
        name: string;
        email: string;
        roles: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            description: string | null;
        }[];
    }[];
}>;
/**
 * Find a user by ID (with roles).
 */
declare function findUserById(id: string, currentUser?: AuthUser): Promise<{
    user: {
        id: string;
        name: string;
        email: string;
        roles: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            description: string | null;
        }[];
    };
}>;
/**
 * List all users who have the 'editor' role
 */
declare function listEditors(): Promise<{
    id: string;
    name: string;
    email: string;
}[]>;
/**
 * Invite an editor - sends invitation email with password setup link
 */
declare function inviteEditor(data: {
    name: string;
    email: string;
}, currentUser?: AuthUser): Promise<{
    success: boolean;
    message: string;
    expiresAt: Date;
}>;
//# sourceMappingURL=user.service.d.ts.map