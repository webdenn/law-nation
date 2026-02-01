import { z } from "zod";
export declare const permissionCreateSchema: z.ZodObject<{
    key: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    module: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const permissionUpdateSchema: z.ZodObject<{
    key: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    module: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=permission.validator.d.ts.map