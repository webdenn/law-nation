import { z } from "zod";

// Create Reviewer Validation Schema
export const createReviewerSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must not exceed 100 characters"),
    
    email: z.string()
      .email("Invalid email format")
      .max(255, "Email must not exceed 255 characters"),
    
    expertise: z.array(z.string())
      .min(1, "At least one area of expertise is required")
      .max(10, "Maximum 10 areas of expertise allowed")
      .default([]),
    
    qualification: z.string()
      .max(200, "Qualification must not exceed 200 characters")
      .optional(),
    
    experience: z.number()
      .int("Experience must be a whole number")
      .min(0, "Experience cannot be negative")
      .max(50, "Experience cannot exceed 50 years")
      .optional(),
    
    bio: z.string()
      .max(1000, "Bio must not exceed 1000 characters")
      .optional()
  })
});

// Update Reviewer Validation Schema
export const updateReviewerSchema = z.object({
  params: z.object({
    id: z.string()
      .min(1, "Reviewer ID is required")
      .max(50, "Invalid reviewer ID format")
  }),
  
  body: z.object({
    name: z.string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must not exceed 100 characters")
      .optional(),
    
    email: z.string()
      .email("Invalid email format")
      .max(255, "Email must not exceed 255 characters")
      .optional(),
    
    expertise: z.array(z.string())
      .min(1, "At least one area of expertise is required")
      .max(10, "Maximum 10 areas of expertise allowed")
      .optional(),
    
    qualification: z.string()
      .max(200, "Qualification must not exceed 200 characters")
      .optional(),
    
    experience: z.number()
      .int("Experience must be a whole number")
      .min(0, "Experience cannot be negative")
      .max(50, "Experience cannot exceed 50 years")
      .optional(),
    
    bio: z.string()
      .max(1000, "Bio must not exceed 1000 characters")
      .optional(),
    
    status: z.enum(['ACTIVE', 'INACTIVE'], {
      errorMap: () => ({ message: "Status must be either ACTIVE or INACTIVE" })
    }).optional()
  })
});

// Get Reviewer by ID Validation Schema
export const getReviewerByIdSchema = z.object({
  params: z.object({
    id: z.string()
      .min(1, "Reviewer ID is required")
      .max(50, "Invalid reviewer ID format")
  })
});

// Delete Reviewer Validation Schema
export const deleteReviewerSchema = z.object({
  params: z.object({
    id: z.string()
      .min(1, "Reviewer ID is required")
      .max(50, "Invalid reviewer ID format")
  })
});

// Assign Article to Reviewer Validation Schema
export const assignArticleToReviewerSchema = z.object({
  params: z.object({
    id: z.string()
      .min(1, "Reviewer ID is required")
      .max(50, "Invalid reviewer ID format")
  }),
  
  body: z.object({
    articleId: z.string()
      .min(1, "Article ID is required")
      .max(50, "Invalid article ID format")
  })
});

// Get Reviewer Stats Validation Schema
export const getReviewerStatsSchema = z.object({
  params: z.object({
    id: z.string()
      .min(1, "Reviewer ID is required")
      .max(50, "Invalid reviewer ID format")
  })
});

// Get Reviewer Workload Validation Schema
export const getReviewerWorkloadSchema = z.object({
  params: z.object({
    id: z.string()
      .min(1, "Reviewer ID is required")
      .max(50, "Invalid reviewer ID format")
  })
});

// Type exports for use in controllers
export type CreateReviewerRequest = z.infer<typeof createReviewerSchema>;
export type UpdateReviewerRequest = z.infer<typeof updateReviewerSchema>;
export type GetReviewerByIdRequest = z.infer<typeof getReviewerByIdSchema>;
export type DeleteReviewerRequest = z.infer<typeof deleteReviewerSchema>;
export type AssignArticleToReviewerRequest = z.infer<typeof assignArticleToReviewerSchema>;
export type GetReviewerStatsRequest = z.infer<typeof getReviewerStatsSchema>;
export type GetReviewerWorkloadRequest = z.infer<typeof getReviewerWorkloadSchema>;