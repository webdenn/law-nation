import { z } from "zod";

// /src/validators/auth.validator.ts
export const loginSchema = z.object({
  email: z.email(), // e.g. .email("Invalid email")
  password: z.string(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});
