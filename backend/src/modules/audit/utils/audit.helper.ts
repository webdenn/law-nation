import { AuditService } from "../services/audit.service.js";
import type { UserProfile, ArticleInfo, EditorInfo, DecisionOutcome } from "../types/audit.type.js";

// Singleton instance for easy access throughout the application
const auditService = new AuditService();

/**
 * Helper functions to record audit events from anywhere in the application
 */

export const recordUserUpload = async (userProfile: UserProfile, articleInfo: ArticleInfo): Promise<void> => {
  try {
    await auditService.recordUserUpload(userProfile, articleInfo);
  } catch (error) {
    console.error('Failed to record user upload audit:', error);
    // Don't throw - audit failures shouldn't break main functionality
  }
};

export const recordEditorAssignment = async (
  adminProfile: UserProfile, 
  articleInfo: ArticleInfo, 
  editorInfo: EditorInfo
): Promise<void> => {
  try {
    await auditService.recordEditorAssignment(adminProfile, articleInfo, editorInfo);
  } catch (error) {
    console.error('Failed to record editor assignment audit:', error);
  }
};

export const recordEditorReassignment = async (
  adminProfile: UserProfile,
  articleInfo: ArticleInfo,
  previousEditor: EditorInfo,
  newEditor: EditorInfo
): Promise<void> => {
  try {
    await auditService.recordEditorReassignment(adminProfile, articleInfo, previousEditor, newEditor);
  } catch (error) {
    console.error('Failed to record editor reassignment audit:', error);
  }
};

export const recordEditorDownload = async (
  editorProfile: UserProfile, 
  articleInfo: ArticleInfo
): Promise<void> => {
  try {
    await auditService.recordEditorDownload(editorProfile, articleInfo);
  } catch (error) {
    console.error('Failed to record editor download audit:', error);
  }
};

export const recordEditorUpload = async (
  editorProfile: UserProfile, 
  articleInfo: ArticleInfo, 
  editingDuration: string
): Promise<void> => {
  try {
    await auditService.recordEditorUpload(editorProfile, articleInfo, editingDuration);
  } catch (error) {
    console.error('Failed to record editor upload audit:', error);
  }
};

export const recordFinalDecision = async (
  adminProfile: UserProfile,
  articleInfo: ArticleInfo,
  outcome: DecisionOutcome
): Promise<void> => {
  try {
    await auditService.recordFinalDecision(adminProfile, articleInfo, outcome);
  } catch (error) {
    console.error('Failed to record final decision audit:', error);
  }
};

// NEW: Reviewer audit helper functions
export const recordReviewerAssignment = async (
  adminProfile: UserProfile,
  articleInfo: ArticleInfo,
  reviewerInfo: EditorInfo
): Promise<void> => {
  try {
    await auditService.recordReviewerAssignment(adminProfile, articleInfo, reviewerInfo);
  } catch (error) {
    console.error('Failed to record reviewer assignment audit:', error);
  }
};

export const recordReviewerReassignment = async (
  adminProfile: UserProfile,
  articleInfo: ArticleInfo,
  previousReviewer: EditorInfo,
  newReviewer: EditorInfo
): Promise<void> => {
  try {
    await auditService.recordReviewerReassignment(adminProfile, articleInfo, previousReviewer, newReviewer);
  } catch (error) {
    console.error('Failed to record reviewer reassignment audit:', error);
  }
};

export const recordReviewerDownload = async (
  reviewerProfile: UserProfile,
  articleInfo: ArticleInfo
): Promise<void> => {
  try {
    await auditService.recordReviewerDownload(reviewerProfile, articleInfo);
  } catch (error) {
    console.error('Failed to record reviewer download audit:', error);
  }
};

export const recordReviewerUpload = async (
  reviewerProfile: UserProfile,
  articleInfo: ArticleInfo,
  editingDuration: { days: number; hours: number; minutes: number }
): Promise<void> => {
  try {
    await auditService.recordReviewerUpload(reviewerProfile, articleInfo, editingDuration);
  } catch (error) {
    console.error('Failed to record reviewer upload audit:', error);
  }
};

export const recordAdminOverride = async (
  adminProfile: UserProfile,
  articleInfo: ArticleInfo,
  overrideType: 'DIRECT_PUBLISH' | 'BYPASS_EDITOR' | 'BYPASS_REVIEWER',
  reason: string
): Promise<void> => {
  try {
    await auditService.recordAdminOverride(adminProfile, articleInfo, overrideType, reason);
  } catch (error) {
    console.error('Failed to record admin override audit:', error);
  }
};

/**
 * Helper to calculate editing duration between two dates
 */
export const calculateEditingDuration = (downloadTime: Date, uploadTime: Date): string => {
  const diffMs = uploadTime.getTime() - downloadTime.getTime();
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  
  return parts.length > 0 ? parts.join(', ') : '0 minutes';
};

/**
 * Helper to format display dates for UI
 */
export const formatDisplayDate = (date: string, time: string, year: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const [yearStr, monthStr, dayStr] = date.split('-');
  const month = months[parseInt(monthStr || '1') - 1] || 'Unknown';
  const day = parseInt(dayStr || '1');
  
  // Convert 24-hour time to 12-hour format
  const [hours, minutes] = time.split(':');
  const hour24 = parseInt(hours || '0');
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  
  return `${month} ${day}, ${year} at ${hour12}:${minutes || '00'} ${ampm}`;
};

/**
 * Helper to get event type display name
 */
export const getEventTypeDisplayName = (eventType: string): string => {
  const displayNames: Record<string, string> = {
    'USER_UPLOAD': 'Article Uploaded',
    'ADMIN_REVIEW': 'Admin Review',
    'EDITOR_ASSIGN': 'Assigned to Editor',
    'EDITOR_REASSIGN': 'Reassigned to Editor',
    'EDITOR_DOWNLOAD': 'Document Downloaded',
    'EDITOR_UPLOAD': 'Document Uploaded',
    'REVIEWER_ASSIGN': 'Assigned to Reviewer',
    'REVIEWER_REASSIGN': 'Reassigned to Reviewer',
    'REVIEWER_DOWNLOAD': 'Document Downloaded by Reviewer',
    'REVIEWER_UPLOAD': 'Document Uploaded by Reviewer',
    'ADMIN_OVERRIDE': 'Admin Override',
    'FINAL_DECISION': 'Final Decision'
  };
  
  return displayNames[eventType] || eventType;
};

/**
 * Helper to get event type icon
 */
export const getEventTypeIcon = (eventType: string): string => {
  const icons: Record<string, string> = {
    'USER_UPLOAD': '📤',
    'ADMIN_REVIEW': '👨‍💼',
    'EDITOR_ASSIGN': '👨‍💼',
    'EDITOR_REASSIGN': '🔄',
    'EDITOR_DOWNLOAD': '📥',
    'EDITOR_UPLOAD': '📤',
    'REVIEWER_ASSIGN': '👨‍🔬',
    'REVIEWER_REASSIGN': '🔄',
    'REVIEWER_DOWNLOAD': '📥',
    'REVIEWER_UPLOAD': '📤',
    'ADMIN_OVERRIDE': '🔒',
    'FINAL_DECISION': '✅'
  };
  
  return icons[eventType] || '📋';
};