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
export async function sendOtpEmail(userEmail, otp) {
    return emailService.sendOtpEmail(userEmail, otp);
}
export async function sendAuthNotification(userEmail, userName) {
    return emailService.sendWelcomeEmail(userEmail, userName);
}
// ==================== ARTICLE EMAILS ====================
// All functions now delegate to EmailService
export async function sendArticleSubmissionConfirmation(authorEmail, authorName, articleTitle, articleId) {
    return emailService.sendArticleSubmissionConfirmation(authorEmail, authorName, articleTitle, articleId);
}
export async function sendCoAuthorNotification(coAuthorEmail, coAuthorName, primaryAuthorName, articleTitle, articleId) {
    return emailService.sendCoAuthorNotification(coAuthorEmail, coAuthorName, primaryAuthorName, articleTitle, articleId);
}
export async function sendAuthorAssignmentNotification(authorEmail, authorName, articleTitle, articleId) {
    return emailService.sendAuthorAssignmentNotification(authorEmail, authorName, articleTitle, articleId);
}
export async function sendEditorAssignmentNotification(editorEmail, editorName, articleTitle, authorName, category, articleId) {
    return emailService.sendEditorAssignmentNotification(editorEmail, editorName, articleTitle, authorName, category, articleId);
}
export async function sendArticleApprovalNotification(authorEmail, authorName, articleTitle, articleId) {
    return emailService.sendArticleApprovalNotification(authorEmail, authorName, articleTitle, articleId);
}
export async function sendArticleCorrectionNotification(authorEmail, authorName, articleTitle, articleId, editorComments) {
    return emailService.sendArticleCorrectionNotification(authorEmail, authorName, articleTitle, articleId, editorComments);
}
export async function sendArticleVerificationEmail(authorEmail, authorName, token) {
    return emailService.sendArticleVerificationEmail(authorEmail, authorName, token);
}
export async function sendArticleVerificationCodeEmail(authorEmail, authorName, code) {
    return emailService.sendArticleVerificationCodeEmail(authorEmail, authorName, code);
}
export async function sendArticlePublishedNotification(uploaderEmail, uploaderName, articleTitle, articleId, diffSummary) {
    return emailService.sendArticlePublishedNotification(uploaderEmail, uploaderName, articleTitle, articleId, diffSummary);
}
// ==================== EDITOR EMAILS ====================
// All functions now delegate to EmailService
export async function sendEditorInvitationEmail(editorEmail, editorName, token) {
    return emailService.sendEditorInvitationEmail(editorEmail, editorName, token);
}
// ==================== ADMIN EMAILS ====================
// All functions now delegate to EmailService
export async function sendEditorApprovalNotificationToAdmin(adminEmail, adminName, articleTitle, editorName, articleId) {
    return emailService.sendEditorApprovalNotificationToAdmin(adminEmail, adminName, articleTitle, editorName, articleId);
}
export async function sendEditorReassignmentNotification(editorEmail, editorName, articleTitle, articleId) {
    return emailService.sendEditorReassignmentNotification(editorEmail, editorName, articleTitle, articleId);
}
//# sourceMappingURL=email.utils.js.map