export interface EditorListItem {
  id: string;
  name: string;
  email: string;
  joiningDate: Date | null;
  status: 'ACTIVE' | 'INACTIVE';
  assignedArticles: number;
  completedArticles: number;
  specialization: string[];
  title?: string | null;
  designation?: string | null;
}

export interface ReviewerListItem {
  id: string;
  name: string;
  email: string;
  joiningDate: Date | null;
  status: 'ACTIVE' | 'INACTIVE';
  assignedReviews: number;
  completedReviews: number;
  expertise: string[];
  qualification?: string | null;
  experience?: number | null;
}

export interface AccessRemovalRequest {
  userId: string;
  userType: 'EDITOR' | 'REVIEWER';
  reason?: string;
}

export interface AccessRemovalResponse {
  success: boolean;
  message: string;
  removedUser: {
    id: string;
    name: string;
    email: string;
    userType: 'EDITOR' | 'REVIEWER';
    removedAt: Date;
    removedBy: string;
  };
  reassignedArticles?: {
    count: number;
    reassignedTo?: string[];
  };
}

export interface AccessManagementStats {
  totalEditors: number;
  activeEditors: number;
  inactiveEditors: number;
  totalReviewers: number;
  activeReviewers: number;
  inactiveReviewers: number;
  recentRemovals: {
    count: number;
    lastWeek: number;
    lastMonth: number;
  };
}

export interface UserAccessHistory {
  userId: string;
  userName: string;
  userEmail: string;
  userType: 'EDITOR' | 'REVIEWER';
  joiningDate: Date | null;
  removalDate: Date | null;
  removedBy?: string;
  removalReason?: string;
  articlesWorkedOn: number;
  lastActivity?: Date;
}