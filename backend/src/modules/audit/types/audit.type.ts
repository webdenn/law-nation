export type AuditEventType = 
  | 'USER_UPLOAD' 
  | 'ADMIN_REVIEW' 
  | 'EDITOR_ASSIGN' 
  | 'EDITOR_REASSIGN' 
  | 'EDITOR_DOWNLOAD' 
  | 'EDITOR_UPLOAD' 
  | 'REVIEWER_ASSIGN'
  | 'REVIEWER_REASSIGN'
  | 'REVIEWER_DOWNLOAD'
  | 'REVIEWER_UPLOAD'
  | 'ADMIN_OVERRIDE'
  | 'FINAL_DECISION';

export type DecisionOutcome = 'PUBLISHED' | 'REJECTED' | 'REVIEWER_APPROVED';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  organization: string;
}

export interface ArticleInfo {
  id: string;
  title: string;
  category: string;
  author: string;
}

export interface EditorInfo {
  id: string;
  name: string;
}

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  eventDate: string;        // "2026-01-21"
  eventTime: string;        // "09:30:15"
  eventYear: number;        // 2026
  userId: string;
  userName: string;
  userEmail: string;
  userOrganization: string;
  articleId: string;
  articleTitle: string;
  articleCategory: string;
  articleAuthor: string;
  targetEditorId?: string;
  targetEditorName?: string;
  previousEditorId?: string;
  previousEditorName?: string;
  decisionOutcome?: DecisionOutcome;
  editingDuration?: string;  // "2 days, 5 hours, 15 minutes"
  createdAt: Date;
}

export interface AuditTimeline {
  articleId: string;
  articleTitle: string;
  events: AuditTimelineEvent[];
}

export interface AuditTimelineEvent {
  eventType: AuditEventType;
  eventDate: string;
  eventTime: string;
  eventYear: number;
  userName: string;
  targetEditorName?: string | undefined;
  previousEditorName?: string | undefined;
  decisionOutcome?: DecisionOutcome | undefined;
  editingDuration?: string | undefined;
}

export interface UserHistory {
  userId: string;
  userName: string;
  submissions: UserSubmission[];
}

export interface UserSubmission {
  articleId: string;
  articleTitle: string;
  uploadDate: string;
  uploadTime: string;
  uploadYear: number;
  finalOutcome?: DecisionOutcome | undefined;
  decisionDate?: string | undefined;
  decisionTime?: string | undefined;
  decisionYear?: number | undefined;
}

export interface EditorActivity {
  editorId: string;
  editorName: string;
  activities: EditorActivityItem[];
}

export interface EditorActivityItem {
  articleId: string;
  articleTitle: string;
  downloadDate?: string | undefined;
  downloadTime?: string | undefined;
  downloadYear?: number | undefined;
  uploadDate?: string | undefined;
  uploadTime?: string | undefined;
  uploadYear?: number | undefined;
  editingDuration?: string | undefined;
}

export interface AdminDecisions {
  adminId: string;
  adminName: string;
  decisions: AdminDecisionItem[];
}

export interface AdminDecisionItem {
  articleId: string;
  articleTitle: string;
  assignments: AssignmentEvent[];
  finalDecision?: FinalDecisionEvent | undefined;
}

export interface AssignmentEvent {
  type: 'ASSIGN' | 'REASSIGN';
  date: string;
  time: string;
  year: number;
  editorName: string;
  previousEditorName?: string | undefined;
}

export interface FinalDecisionEvent {
  outcome: DecisionOutcome;
  date: string;
  time: string;
  year: number;
}