// src/services/email/email.service.ts

import { EmailAdapterFactory } from "@/adapters/email/email.adapter.factory.js";
import type { IEmailAdapter } from "@/adapters/email/interfaces/email-adapter.interface.js";
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
  private adapter: IEmailAdapter;

  constructor() {
    this.adapter = EmailAdapterFactory.getAdapter();
  }

  /**
   * Core send email method
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      console.log(`📧 [EmailService] Sending email to: ${to}`);
      console.log(`📧 [EmailService] Subject: ${subject}`);

      const result = await this.adapter.send({
        to,
        subject,
        html,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to send email");
      }

      console.log(`✅ [EmailService] Email sent successfully via ${result.provider}`);
    } catch (error) {
      console.error("❌ [EmailService] Failed to send email:", {
        to,
        subject,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  // ==================== AUTH EMAILS ====================

  /**
   * Send OTP verification email
   */
  async sendOtpEmail(userEmail: string, otp: string): Promise<void> {
    const { subject, html } = generateOtpEmailHtml({ otp });
    await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Send welcome email after registration
   */
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
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
  async sendArticleSubmissionConfirmation(
    authorEmail: string,
    authorName: string,
    articleTitle: string,
    articleId: string
  ): Promise<void> {
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
  async sendCoAuthorNotification(
    coAuthorEmail: string,
    coAuthorName: string,
    primaryAuthorName: string,
    articleTitle: string,
    articleId: string
  ): Promise<void> {
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
  async sendAuthorAssignmentNotification(
    authorEmail: string,
    authorName: string,
    articleTitle: string,
    articleId: string
  ): Promise<void> {
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
  async sendEditorAssignmentNotification(
    editorEmail: string,
    editorName: string,
    articleTitle: string,
    authorName: string,
    category: string,
    articleId: string
  ): Promise<void> {
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
  async sendArticleApprovalNotification(
    authorEmail: string,
    authorName: string,
    articleTitle: string,
    articleId: string
  ): Promise<void> {
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
  async sendArticleCorrectionNotification(
    authorEmail: string,
    authorName: string,
    articleTitle: string,
    articleId: string,
    editorComments?: string
  ): Promise<void> {
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
  async sendArticleVerificationEmail(
    authorEmail: string,
    authorName: string,
    token: string
  ): Promise<void> {
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
  async sendArticleVerificationCodeEmail(
    authorEmail: string,
    authorName: string,
    code: string
  ): Promise<void> {
    const { subject, html } = generateArticleVerificationCodeHtml({
      authorName,
      code,
    });
    await this.sendEmail(authorEmail, subject, html);
  }

  /**
   * Send article published notification
   */
  async sendArticlePublishedNotification(
    uploaderEmail: string,
    uploaderName: string,
    articleTitle: string,
    articleId: string,
    diffSummary?: string
  ): Promise<void> {
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
  async sendEditorInvitationEmail(
    editorEmail: string,
    editorName: string,
    token: string
  ): Promise<void> {
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
  async sendEditorApprovalNotificationToAdmin(
    adminEmail: string,
    adminName: string,
    articleTitle: string,
    editorName: string,
    articleId: string
  ): Promise<void> {
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
  async sendEditorReassignmentNotification(
    editorEmail: string,
    editorName: string,
    articleTitle: string,
    articleId: string
  ): Promise<void> {
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
