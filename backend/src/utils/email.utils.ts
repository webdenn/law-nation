/**
 * @deprecated This file is maintained for backward compatibility only.
 * All email functions now use the new EmailService with adapter pattern.
 * 
 * New architecture:
 * - Templates: src/templates/email/ (unchanged)
 * - Service: src/services/email/email.service.ts (business logic)
 * - Adapters: src/adapters/email/ (provider implementations)
 * 
 * To switch email providers, update EMAIL_PROVIDER in .env
 */

import { emailService } from "@/services/email/email.service.js";

// ==================== AUTH EMAILS ====================
// All functions now delegate to EmailService

export async function sendOtpEmail(userEmail: string, otp: string) {
  return emailService.sendOtpEmail(userEmail, otp);
}

export async function sendAuthNotification(userEmail: string, userName: string) {
  return emailService.sendWelcomeEmail(userEmail, userName);
}

// ==================== ARTICLE EMAILS ====================
// All functions now delegate to EmailService

export async function sendArticleSubmissionConfirmation(
  authorEmail: string,
  authorName: string,
  articleTitle: string,
  articleId: string
) {
  return emailService.sendArticleSubmissionConfirmation(authorEmail, authorName, articleTitle, articleId);
}

export async function sendCoAuthorNotification(
  coAuthorEmail: string,
  coAuthorName: string,
  primaryAuthorName: string,
  articleTitle: string,
  articleId: string
) {
  return emailService.sendCoAuthorNotification(coAuthorEmail, coAuthorName, primaryAuthorName, articleTitle, articleId);
}

export async function sendAuthorAssignmentNotification(
  authorEmail: string,
  authorName: string,
  articleTitle: string,
  articleId: string
) {
  return emailService.sendAuthorAssignmentNotification(authorEmail, authorName, articleTitle, articleId);
}

export async function sendEditorAssignmentNotification(
  editorEmail: string,
  editorName: string,
  articleTitle: string,
  authorName: string,
  category: string,
  articleId: string
) {
  return emailService.sendEditorAssignmentNotification(editorEmail, editorName, articleTitle, authorName, category, articleId);
}

export async function sendArticleApprovalNotification(
  authorEmail: string,
  authorName: string,
  articleTitle: string,
  articleId: string
) {
  return emailService.sendArticleApprovalNotification(authorEmail, authorName, articleTitle, articleId);
}

export async function sendArticleCorrectionNotification(
  authorEmail: string,
  authorName: string,
  articleTitle: string,
  articleId: string,
  editorComments?: string
) {
  return emailService.sendArticleCorrectionNotification(authorEmail, authorName, articleTitle, articleId, editorComments);
}

export async function sendArticleVerificationEmail(
  authorEmail: string,
  authorName: string,
  token: string
) {
  return emailService.sendArticleVerificationEmail(authorEmail, authorName, token);
}

export async function sendArticleVerificationCodeEmail(
  authorEmail: string,
  authorName: string,
  code: string
) {
  return emailService.sendArticleVerificationCodeEmail(authorEmail, authorName, code);
}

export async function sendArticlePublishedNotification(
  uploaderEmail: string,
  uploaderName: string,
  articleTitle: string,
  articleId: string,
  diffSummary?: string
) {
  return emailService.sendArticlePublishedNotification(uploaderEmail, uploaderName, articleTitle, articleId, diffSummary);
}

// ==================== EDITOR EMAILS ====================
// All functions now delegate to EmailService

export async function sendEditorInvitationEmail(
  editorEmail: string,
  editorName: string,
  token: string
) {
  return emailService.sendEditorInvitationEmail(editorEmail, editorName, token);
}

// ==================== ADMIN EMAILS ====================
// All functions now delegate to EmailService

export async function sendEditorApprovalNotificationToAdmin(
  adminEmail: string,
  adminName: string,
  articleTitle: string,
  editorName: string,
  articleId: string
) {
  return emailService.sendEditorApprovalNotificationToAdmin(adminEmail, adminName, articleTitle, editorName, articleId);
}

export async function sendEditorReassignmentNotification(
  editorEmail: string,
  editorName: string,
  articleTitle: string,
  articleId: string
) {
  return emailService.sendEditorReassignmentNotification(editorEmail, editorName, articleTitle, articleId);
}
