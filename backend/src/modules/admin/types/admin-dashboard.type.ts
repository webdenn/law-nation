export interface DashboardSummary {
  totalSubmissions: number;
  published: number;
  pendingReview: number;
  underReview: number;
  approved: number;
  rejected: number;
}

export interface TimeMetrics {
  averageDays: {
    submissionToPublished: number;
    submissionToAssigned: number;
    assignedToReviewed: number;
    reviewedToApproved: number;
    approvedToPublished: number;
  };
  medianDays: {
    submissionToPublished: number;
    submissionToAssigned: number;
    assignedToReviewed: number;
  };
}

export interface StatusDistribution {
  statusCounts: Record<string, number>;
  percentages: Record<string, number>;
}

export interface ArticleTimeline {
  id: string;
  title: string;
  status: string;
  authorName: string;
  abstract?: string;
  assignedEditorId?: string | null;
  originalPdfUrl?: string;
  currentPdfUrl?: string;
  timeline: {
    submittedAt: Date;
    assignedAt: Date | null;
    reviewedAt: Date | null;
    approvedAt: Date | null;
    publishedAt: Date | null;
  };
  durations: {
    submissionToAssigned: number | null;
    assignedToReviewed: number | null;
    reviewedToApproved: number | null;
    approvedToPublished: number | null;
    totalDays: number | null;
  };
}

export interface ArticlesTimelineResponse {
  articles: ArticleTimeline[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}