// src/services/email/email.service.ts
import { EmailAdapterFactory } from "@/adapters/email/email.adapter.factory.js";
import { generateOtpEmailHtml } from "@/templates/email/auth/otp.template.js";
import { generateWelcomeEmailHtml } from "@/templates/email/auth/welcome.template.js";
import { generateArticleSubmissionHtml } from "@/templates/email/article/submission.template.js";
import { generateArticleVerificationHtml } from "@/templates/email/article/verification.template.js";
import { generateArticleVerificationCodeHtml } from "@/templates/email/article/verification-code.template.js";
import { generateAuthorAssignmentHtml } from "@/templates/email/article/assignment.template.js";
import { generateArticleApprovalHtml } from "@/templates/email/article/approval.template.js";
import { generateArticleCorrectionHtml } from "@/templates/email/article/correction.template.js";
import { generateEditorInvitationHtml } from "@/templates/email/editor/invitation.template.js";
import { generateEditorTaskAssignedHtml } from "@/templates/email/editor/task-assigned.template.js";
import { generateCoAuthorNotificationHtml } from "@/templates/email/article/coauthor-notification.template.js";
import { generateArticlePublishedHtml } from "@/templates/email/article/published.template.js";
import { generateEditorApprovalNotificationHtml } from "@/templates/email/admin/editor-approval.template.js";
import { generateEditorReassignmentNotificationHtml } from "@/templates/email/editor/reassignment-notification.template.js";
/**
 * Email Service
 * Handles all email sending logic using the adapter pattern
 */
export class EmailService {
    adapter;
    constructor() {
        this.adapter = EmailAdapterFactory.getAdapter();
    }
    /**
     * Core send email method
     */
    async sendEmail(to, subject, html) {
        try {
            console.log(`📧 [EmailService] Sending email to: ${to}`);
            console.log(`📧 [EmailService] Subject: ${subject}`);
            const result = await this.adapter.send({
                to,
                subject,
                html,
            });
            if (!result.success) {
                console.error("❌ [EmailService] Failed to send email:", {
                    to,
                    subject,
                    error: result.error || "Failed to send email",
                });
                // Don't throw - log error and continue (non-blocking email)
                return;
            }
            console.log(`✅ [EmailService] Email sent successfully via ${result.provider}`);
        }
        catch (error) {
            console.error("❌ [EmailService] Failed to send email:", {
                to,
                subject,
                error: error instanceof Error ? error.message : error,
            });
            // Don't throw - log error and continue (non-blocking email)
        }
    }
    // ==================== AUTH EMAILS ====================
    /**
     * Send OTP verification email
     */
    async sendOtpEmail(userEmail, otp) {
        const { subject, html } = generateOtpEmailHtml({ otp });
        await this.sendEmail(userEmail, subject, html);
    }
    /**
     * Send welcome email after registration
     */
    async sendWelcomeEmail(userEmail, userName) {
        const { subject, html } = generateWelcomeEmailHtml({
            userName,
            frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
        });
        await this.sendEmail(userEmail, subject, html);
    }
    // ==================== ARTICLE EMAILS ====================
    /**
     * Send article submission confirmation
     */
    async sendArticleSubmissionConfirmation(authorEmail, authorName, articleTitle, articleId) {
        const { subject, html } = generateArticleSubmissionHtml({
            authorName,
            articleTitle,
            articleId,
        });
        await this.sendEmail(authorEmail, subject, html);
    }
    /**
     * Send notification to co-author
     */
    async sendCoAuthorNotification(coAuthorEmail, coAuthorName, primaryAuthorName, articleTitle, articleId) {
        const { subject, html } = generateCoAuthorNotificationHtml({
            coAuthorName,
            primaryAuthorName,
            articleTitle,
            articleId,
        });
        await this.sendEmail(coAuthorEmail, subject, html);
    }
    /**
     * Send editor assignment notification to author
     */
    async sendAuthorAssignmentNotification(authorEmail, authorName, articleTitle, articleId) {
        const { subject, html } = generateAuthorAssignmentHtml({
            authorName,
            articleTitle,
            articleId,
        });
        await this.sendEmail(authorEmail, subject, html);
    }
    /**
     * Send article assignment notification to editor
     */
    async sendEditorAssignmentNotification(editorEmail, editorName, articleTitle, authorName, category, articleId) {
        const { subject, html } = generateEditorTaskAssignedHtml({
            editorName,
            articleTitle,
            authorName,
            category,
            articleId,
        });
        await this.sendEmail(editorEmail, subject, html);
    }
    /**
     * Send article approval notification
     */
    async sendArticleApprovalNotification(authorEmail, authorName, articleTitle, articleId) {
        const { subject, html } = generateArticleApprovalHtml({
            authorName,
            articleTitle,
            articleId,
        });
        await this.sendEmail(authorEmail, subject, html);
    }
    /**
     * Send article correction notification
     */
    async sendArticleCorrectionNotification(authorEmail, authorName, articleTitle, articleId, editorComments) {
        const { subject, html } = generateArticleCorrectionHtml({
            authorName,
            articleTitle,
            articleId,
            ...(editorComments && { editorComments }),
        });
        await this.sendEmail(authorEmail, subject, html);
    }
    /**
     * Send article verification email with token
     */
    async sendArticleVerificationEmail(authorEmail, authorName, token) {
        const { subject, html } = generateArticleVerificationHtml({
            authorName,
            token,
            backendUrl: process.env.BACKEND_URL || "http://localhost:4000",
        });
        await this.sendEmail(authorEmail, subject, html);
    }
    /**
     * Send article verification email with code
     */
    async sendArticleVerificationCodeEmail(authorEmail, authorName, code) {
        const { subject, html } = generateArticleVerificationCodeHtml({
            authorName,
            code,
        });
        await this.sendEmail(authorEmail, subject, html);
    }
    /**
     * Send article published notification
     */
    async sendArticlePublishedNotification(uploaderEmail, uploaderName, articleTitle, articleId, diffSummary) {
        const { subject, html } = generateArticlePublishedHtml({
            authorName: uploaderName,
            articleTitle,
            articleId,
            ...(diffSummary && { diffSummary }),
        });
        await this.sendEmail(uploaderEmail, subject, html);
    }
    // ==================== EDITOR EMAILS ====================
    /**
     * Send editor invitation email
     */
    async sendEditorInvitationEmail(editorEmail, editorName, token) {
        console.log(`📧 [EmailService] Preparing editor invitation for: ${editorEmail}`);
        const { subject, html } = generateEditorInvitationHtml({
            editorName,
            token,
            frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
        });
        await this.sendEmail(editorEmail, subject, html);
    }
    // ==================== ADMIN EMAILS ====================
    /**
     * Send editor approval notification to admin
     */
    async sendEditorApprovalNotificationToAdmin(adminEmail, adminName, articleTitle, editorName, articleId) {
        const { subject, html } = generateEditorApprovalNotificationHtml({
            adminName,
            articleTitle,
            editorName,
            articleId,
        });
        await this.sendEmail(adminEmail, subject, html);
    }
    /**
     * Send editor reassignment notification to old editor
     */
    async sendEditorReassignmentNotification(editorEmail, editorName, articleTitle, articleId) {
        console.log(`📧 [EmailService] Sending reassignment notification to: ${editorEmail}`);
        const { subject, html } = generateEditorReassignmentNotificationHtml({
            editorName,
            articleTitle,
            articleId,
        });
        await this.sendEmail(editorEmail, subject, html);
    }
}
// Export singleton instance
export const emailService = new EmailService();
//# sourceMappingURL=email.service.js.map