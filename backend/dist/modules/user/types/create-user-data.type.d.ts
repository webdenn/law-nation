import type { createUserSchema } from "@/modules/user/validators/user.validator.js";
import { z } from "zod";
export type CreateUserData = z.infer<typeof createUserSchema>;
//# sourceMappingURL=create-user-data.type.d.ts.map