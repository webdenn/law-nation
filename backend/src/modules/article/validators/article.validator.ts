import { z } from "zod";
import { ArticleStatus } from "@prisma/client";

export const articleSubmissionSchema = z.object({
  // Primary author (required)
  authorName: z.string().min(2, "Primary author name is required"),
  authorEmail: z.string().email("Valid email is required"),
  authorPhone: z.string().optional(),
  authorOrganization: z.string().optional(),
  
  // Second author (optional)
  secondAuthorName: z.string().min(2, "Second author name must be at least 2 characters").optional(),
  secondAuthorEmail: z.string().email("Valid email is required for second author").optional(),
  secondAuthorPhone: z.string().optional(),
  secondAuthorOrganization: z.string().optional(),
  
  // Article details
  title: z.string()
    .min(50, "Title must be at least 50 characters")
    .max(100, "Title must not exceed 100 characters")
    .regex(
      /^[a-zA-Z0-9\s\-:,.'&()]+$/,
      "Title can only contain letters, numbers, spaces, and basic punctuation (- : , . ' & ( ))"
    ),
  category: z.string().min(2, "Category is required"),
  abstract: z.string()
    .min(50, "Abstract must be at least 50 characters")
    .max(500, "Abstract must not exceed 500 characters"),
  keywords: z.string().optional(),
  coAuthors: z.string().optional(),
  remarksToEditor: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
}).refine(
  (data) => {
    // If second author name is provided, email must also be provided
    if (data.secondAuthorName && !data.secondAuthorEmail) {
      return false;
    }
    return true;
  },
  {
    message: "Second author email is required when second author name is provided",
    path: ["secondAuthorEmail"]
  }
).refine(
  (data) => {
    // If second author email is provided, name must also be provided
    if (data.secondAuthorEmail && !data.secondAuthorName) {
      return false;
    }
    return true;
  },
  {
    message: "Second author name is required when second author email is provided",
    path: ["secondAuthorName"]
  }
);

export const assignEditorSchema = z.object({
  editorId: z.string().cuid("Invalid editor ID"),
  reason: z.string().max(500, "Reason must not exceed 500 characters").optional(),
  preserveWork: z.boolean().optional().default(true), // Default: keep previous editor's work
});

export const articleListQuerySchema = z.object({
  status: z.nativeEnum(ArticleStatus).optional(),
  category: z.string().optional(),
  authorEmail: z.string().email().optional(),
  assignedEditorId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const uploadCorrectedPdfSchema = z.object({
  comments: z.string().optional(),
});
