export interface Reviewer {
  id: string;
  name: string;
  email: string;
  expertise: string[]; // ["legal", "taxation", "corporate", "constitutional"]
  qualification: string | null; // educational background
  experience: number | null; // years of experience
  bio: string | null; // professional background
  assignedReviews: number;
  completedReviews: number;
  averageReviewTime: number; // in days
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewerStats {
  totalAssigned: number;
  totalCompleted: number;
  inProgress: number;
  averageReviewTime: number; // in days
  qualityScore: number; // 0-100 based on review quality
}

export interface ReviewerWorkload {
  reviewerId: string;
  reviewerName: string;
  currentReviews: {
    articleId: string;
    articleTitle: string;
    assignedDate: Date;
    dueDate?: Date | undefined;
    status: string;
  }[];
  workloadScore: number; // 0-100 based on current reviews
}

export interface CreateReviewerData {
  name: string;
  email: string;
  expertise: string[];
  qualification?: string | null;
  experience?: number | null;
  bio?: string | null;
}

export interface UpdateReviewerData {
  name?: string;
  email?: string;
  expertise?: string[];
  qualification?: string | null;
  experience?: number | null;
  bio?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
}