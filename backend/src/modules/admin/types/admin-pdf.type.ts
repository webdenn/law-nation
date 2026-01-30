export interface AdminPdfUploadRequest {
  title: string;
  shortDescription?: string;
  issue: string; // Month (e.g., "January", "February")
  volume: string; // Year (e.g., "2026")
}

export interface AdminPdfUpdateRequest {
  title?: string;
  shortDescription?: string;
  issue?: string;
  volume?: string;
  isVisible?: boolean;
}

export interface AdminPdfResponse {
  id: string;
  title: string;
  shortDescription?: string;
  issue: string;
  volume: string;
  originalPdfUrl: string;
  watermarkedPdfUrl: string;
  fileSize: string; // Formatted file size (e.g., "2.5 MB")
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
  isVisible: boolean;
  uploader: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AdminPdfListResponse {
  pdfs: AdminPdfResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminPdfQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  volume?: string;
  issue?: string;
  isVisible?: boolean;
  sortBy?: 'uploadedAt' | 'title' | 'volume' | 'issue';
  sortOrder?: 'asc' | 'desc';
}

export interface AdminPdfDeleteResponse {
  success: boolean;
  message: string;
}

export interface AdminPdfStatsResponse {
  totalPdfs: number;
  totalSize: string; // Formatted total size
  visiblePdfs: number;
  hiddenPdfs: number;
  volumeStats: Array<{
    volume: string;
    count: number;
    size: string;
  }>;
  issueStats: Array<{
    issue: string;
    count: number;
    size: string;
  }>;
}