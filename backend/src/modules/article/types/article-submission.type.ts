import type { ArticleStatus } from "@prisma/client";

export interface ArticleSubmissionData {
  authorName: string;
  authorEmail: string;
  authorPhone?: string | undefined;
  authorOrganization?: string | undefined;
  secondAuthorName?: string | undefined;
  secondAuthorEmail?: string | undefined;
  secondAuthorPhone?: string | undefined;
  secondAuthorOrganization?: string | undefined;
  title: string;
  category: string;
  abstract: string;
  keywords?: string | undefined;
  coAuthors?: string | undefined;
  remarksToEditor?: string | undefined;
  pdfUrl: string;
  thumbnailUrl?: string | undefined;
  imageUrls?: string[] | undefined;
}

// Extended type for verification metadata (includes temp file path)
export interface ArticleVerificationMetadata extends ArticleSubmissionData {
  tempPdfPath?: string;
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
  editorDocumentUrl?: string | undefined;
  editorDocumentType?: 'PDF' | 'WORD' | undefined;
}
