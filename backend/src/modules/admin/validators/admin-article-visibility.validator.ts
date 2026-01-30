import { z } from 'zod';

export const toggleVisibilitySchema = z.object({
  body: z.object({
    isVisible: z.boolean({
      message: 'isVisible must be a boolean'
    })
  }),
  params: z.object({
    id: z.string({
      message: 'Article ID is required'
    }).min(1, 'Article ID cannot be empty')
  })
});

export const getHiddenArticlesSchema = z.object({
  query: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 10)
  })
});

export type ToggleVisibilityRequest = z.infer<typeof toggleVisibilitySchema>;
export type GetHiddenArticlesRequest = z.infer<typeof getHiddenArticlesSchema>;