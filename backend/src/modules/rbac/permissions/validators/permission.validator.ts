import { z } from "zod";

// src/modules/rbac/permissions/permission.validator.ts
export const permissionCreateSchema = z.object({
  key: z.string().min(3),
  description: z.string().optional(),
  module: z.string().optional(),
});

export const permissionUpdateSchema = z.object({
  key: z.string().min(3).optional(),
  description: z.string().optional(),
  module: z.string().optional(),
});
