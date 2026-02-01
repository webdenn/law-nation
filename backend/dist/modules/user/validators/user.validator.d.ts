import { z } from "zod";
export declare const createUserSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    roleIds: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const inviteEditorSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=user.validator.d.ts.map