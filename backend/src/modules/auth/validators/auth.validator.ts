import { z } from "zod";

// Strong password validation regex
// At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const strongPasswordValidation = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    passwordRegex,
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
  );

// /src/validators/auth.validator.ts
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  recaptchaToken: z.string().min(1, "reCAPTCHA verification is required"),
});

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: strongPasswordValidation,
  phone: z.string().optional(),
  recaptchaToken: z.string().min(1, "reCAPTCHA verification is required"),
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
  password: strongPasswordValidation,
});
