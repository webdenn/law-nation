export interface Editor {
  id: string;
  name: string;
  email: string;
  title: string | null; // "B.Com (Hons.), FCA"
  designation: string | null; // "Chartered Accountant"
  specialization: string[]; // ["taxation", "financial", "commercial"]
  experience: number | null; // years of experience
  bio: string | null; // professional background
  assignedArticles: number;
  completedArticles: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

export interface EditorStats {
  totalAssigned: number;
  totalCompleted: number;
  inProgress: number;
  averageCompletionTime: number; // in days
  successRate: number; // percentage
}

export interface EditorWorkload {
  editorId: string;
  editorName: string;
  currentAssignments: {
    articleId: string;
    articleTitle: string;
    assignedDate: Date;
    dueDate?: Date | undefined;
    status: string;
  }[];
  workloadScore: number; // 0-100 based on current assignments
}

export interface CreateEditorData {
  name: string;
  email: string;
  title?: string | null;
  designation?: string | null;
  specialization: string[];
  experience?: number | null;
  bio?: string | null;
}

export interface UpdateEditorData {
  name?: string;
  email?: string;
  title?: string | null;
  designation?: string | null;
  specialization?: string[];
  experience?: number | null;
  bio?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
}