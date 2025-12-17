import { z } from "zod";

// /src/validators/user.validator.ts
export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(6),
  roleIds: z.array(z.uuid()).nonempty(), // multiple roles
});
