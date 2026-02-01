import { z } from "zod";

// Strong password validation regex
// 8-16 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;

const strongPasswordValidation = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(16, "Password must not exceed 16 characters")
  .regex(
    passwordRegex,
    "Password must be 8-16 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
  );

// /src/validators/user.validator.ts
export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: strongPasswordValidation,
  roleIds: z.array(z.string().cuid()).nonempty("At least one role is required"),
});

export const inviteEditorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

export const inviteReviewerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});
