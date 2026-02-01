import { z } from "zod";
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    recaptchaToken: z.ZodString;
}, z.core.$strip>;
export declare const signupSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    recaptchaToken: z.ZodString;
}, z.core.$strip>;
export declare const refreshSchema: z.ZodObject<{
    refreshToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const logoutSchema: z.ZodObject<{
    refreshToken: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const sendOtpSchema: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strip>;
export declare const verifyOtpSchema: z.ZodObject<{
    email: z.ZodString;
    otp: z.ZodString;
}, z.core.$strip>;
export declare const setupPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=auth.validator.d.ts.map