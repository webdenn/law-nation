// src/dto/user.dto.ts
import { prisma } from "@/db/db.js";
/**
 * Convert a userId -> UserDTO
 */
export const userIdToUserDTO = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            roles: { include: { role: true } },
        },
    });
    if (!user)
        throw new Error("User not found");
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles.map((userRole) => userRole.role.name),
    };
};
//# sourceMappingURL=user.dto.js.map