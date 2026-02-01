import { z } from "zod";

// Create Editor Validation Schema
export const createEditorSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must not exceed 100 characters"),
    
    email: z.string()
      .min(1, "Email is required")
      .max(255, "Email must not exceed 255 characters")
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"),
    
    title: z.string()
      .max(100, "Title must not exceed 100 characters")
      .optional(),
    
    designation: z.string()
      .max(100, "Designation must not exceed 100 characters")
      .optional(),
    
    specialization: z.array(z.string())
      .max(10, "Maximum 10 specializations allowed")
      .default([]),
    
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

// Update Editor Validation Schema
export const updateEditorSchema = z.object({
  params: z.object({
    id: z.string()
      .min(1, "Editor ID is required")
      .max(50, "Invalid editor ID format")
  }),
  
  body: z.object({
    name: z.string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must not exceed 100 characters")
      .optional(),
    
    email: z.string()
      .min(1, "Email is required")
      .max(255, "Email must not exceed 255 characters")
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format")
      .optional(),
    
    title: z.string()
      .max(100, "Title must not exceed 100 characters")
      .optional(),
    
    designation: z.string()
      .max(100, "Designation must not exceed 100 characters")
      .optional(),
    
    specialization: z.array(z.string())
      .max(10, "Maximum 10 specializations allowed")
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
      message: "Status must be either ACTIVE or INACTIVE"
    }).optional()
  })
});

// Get Editor by ID Validation Schema
export const getEditorByIdSchema = z.object({
  params: z.object({
    id: z.string()
      .min(1, "Editor ID is required")
      .max(50, "Invalid editor ID format")
  })
});

// Delete Editor Validation Schema
export const deleteEditorSchema = z.object({
  params: z.object({
    id: z.string()
      .min(1, "Editor ID is required")
      .max(50, "Invalid editor ID format")
  })
});

// Assign Article to Editor Validation Schema
export const assignArticleToEditorSchema = z.object({
  params: z.object({
    id: z.string()
      .min(1, "Editor ID is required")
      .max(50, "Invalid editor ID format")
  }),
  
  body: z.object({
    articleId: z.string()
      .min(1, "Article ID is required")
      .max(50, "Invalid article ID format")
  })
});

// Get Editor Stats Validation Schema
export const getEditorStatsSchema = z.object({
  params: z.object({
    id: z.string()
      .min(1, "Editor ID is required")
      .max(50, "Invalid editor ID format")
  })
});

// Get Editor Workload Validation Schema
export const getEditorWorkloadSchema = z.object({
  params: z.object({
    id: z.string()
      .min(1, "Editor ID is required")
      .max(50, "Invalid editor ID format")
  })
});

// Type exports for use in controllers
export type CreateEditorRequest = z.infer<typeof createEditorSchema>;
export type UpdateEditorRequest = z.infer<typeof updateEditorSchema>;
export type GetEditorByIdRequest = z.infer<typeof getEditorByIdSchema>;
export type DeleteEditorRequest = z.infer<typeof deleteEditorSchema>;
export type AssignArticleToEditorRequest = z.infer<typeof assignArticleToEditorSchema>;
export type GetEditorStatsRequest = z.infer<typeof getEditorStatsSchema>;
export type GetEditorWorkloadRequest = z.infer<typeof getEditorWorkloadSchema>;