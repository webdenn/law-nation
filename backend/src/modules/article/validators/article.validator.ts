import { z } from "zod";
import { ArticleStatus } from "@prisma/client";

export const articleSubmissionSchema = z.object({
  authorName: z.string().min(2, "Author name is required"),
  authorEmail: z.string().email("Valid email is required"),
  authorPhone: z.string().optional(),
  authorOrganization: z.string().optional(),
  title: z.string().min(5, "Title must be at least 5 characters"),
  category: z.string().min(2, "Category is required"),
  abstract: z.string().min(50, "Abstract must be at least 50 characters"),
  keywords: z.string().optional(),
  coAuthors: z.string().optional(),
  remarksToEditor: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
});

export const assignEditorSchema = z.object({
  editorId: z.string().cuid("Invalid editor ID"),
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
