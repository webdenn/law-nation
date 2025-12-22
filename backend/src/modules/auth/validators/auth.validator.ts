import { z } from "zod";

// /src/validators/auth.validator.ts
export const loginSchema = z.object({
  email: z.email(), // e.g. .email("Invalid email")
  password: z.string(),
});

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

// OTP verification schemas
export const sendOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

// Setup password schema (for editor invitation)
export const setupPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
