/**
 * UserDTO now returns multi-team memberships via teamMembers[]
 */
export type UserDTO = {
    id: string;
    name: string;
    email: string;
    roles: string[];
};
/**
 * Convert a userId -> UserDTO
 */
export declare const userIdToUserDTO: (userId: string) => Promise<UserDTO>;
//# sourceMappingURL=user.dto.d.ts.map