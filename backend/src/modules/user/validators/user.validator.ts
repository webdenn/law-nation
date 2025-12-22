import { z } from "zod";

// /src/validators/user.validator.ts
export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(6),
  roleIds: z.array(z.string().cuid()).nonempty(), // multiple roles - using CUID format
});

export const inviteEditorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});
