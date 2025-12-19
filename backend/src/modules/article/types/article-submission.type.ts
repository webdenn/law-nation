import type { ArticleStatus } from "@prisma/client";

export interface ArticleSubmissionData {
  authorName: string;
  authorEmail: string;
  authorPhone?: string | undefined;
  authorOrganization?: string | undefined;
  title: string;
  category: string;
  abstract: string;
  keywords?: string | undefined;
  coAuthors?: string | undefined;
  remarksToEditor?: string | undefined;
  pdfUrl: string;
}

export interface ArticleListFilters {
  status?: ArticleStatus;
  category?: string;
  authorEmail?: string;
  assignedEditorId?: string;
  page?: number;
  limit?: number;
}

export interface AssignEditorData {
  editorId: string;
}

export interface UploadCorrectedPdfData {
  pdfUrl: string;
  comments?: string | undefined;
}
