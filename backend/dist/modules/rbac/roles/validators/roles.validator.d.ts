import { z } from "zod";
export declare const roleCreateSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const roleUpdateSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const assignPermissionSchema: z.ZodObject<{
    permissionId: z.ZodString;
}, z.core.$strip>;
export declare const assignRoleToUserSchema: z.ZodObject<{
    userId: z.ZodString;
    roleId: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=roles.validator.d.ts.map