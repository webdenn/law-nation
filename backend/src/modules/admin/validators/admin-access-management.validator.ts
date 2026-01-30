import { z } from "zod";

export const removeAccessSchema = z.object({
  body: z.object({
    userId: z.string().min(1, "User ID is required"),
    userType: z.enum(['EDITOR', 'REVIEWER'], {
      errorMap: () => ({ message: "User type must be either EDITOR or REVIEWER" })
    }),
    reason: z.string().optional()
  })
});

export const getEditorsListSchema = z.object({
  query: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'ALL']).optional().default('ALL'),
    page: z.string().regex(/^\d+$/).transform(Number).optional().default(1),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default(10),
    search: z.string().optional()
  })
});

export const getReviewersListSchema = z.object({
  query: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'ALL']).optional().default('ALL'),
    page: z.string().regex(/^\d+$/).transform(Number).optional().default(1),
    limit: z.string().regex(/^\d+$/).transform(Number).optional().default(10),
    search: z.string().optional()
  })
});

export const getUserAccessHistorySchema = z.object({
  params: z.object({
    userId: z.string().min(1, "User ID is required")
  })
});

export type RemoveAccessRequest = z.infer<typeof removeAccessSchema>;
export type GetEditorsListRequest = z.infer<typeof getEditorsListSchema>;
export type GetReviewersListRequest = z.infer<typeof getReviewersListSchema>;
export type GetUserAccessHistoryRequest = z.infer<typeof getUserAccessHistorySchema>;