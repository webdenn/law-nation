import nodemailer from "nodemailer";
import dotenv from "dotenv";
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

dotenv.config();

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE === "true" || true, 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS,
  },
});

// Main sendEmail function
export async function sendEmail(options: EmailOptions) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("Missing EMAIL_USER or EMAIL_PASS in .env file");
    }
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Law Nation" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log(`Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error("Email send error:", error);
    throw error;
  }
}

// --- AUTH EMAILS ---

export async function sendOtpEmail(userEmail: string, otp: string) {
  const { subject, html } = generateOtpEmailHtml({ otp });
  return sendEmail({ to: userEmail, subject, html });
}

export async function sendAuthNotification(userEmail: string, userName: string) {
  const { subject, html } = generateWelcomeEmailHtml({
    userName,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  });
  return sendEmail({ to: userEmail, subject, html });
}

// --- ARTICLE EMAILS ---

export async function sendArticleSubmissionConfirmation(authorEmail: string, authorName: string, articleTitle: string, articleId: string) {
  const { subject, html } = generateArticleSubmissionHtml({
    authorName,
    articleTitle,
    articleId
  });
  return sendEmail({ to: authorEmail, subject, html });
}

export async function sendCoAuthorNotification(coAuthorEmail: string, coAuthorName: string, primaryAuthorName: string, articleTitle: string, articleId: string) {
  const { subject, html } = generateCoAuthorNotificationHtml({
    coAuthorName,
    primaryAuthorName,
    articleTitle,
    articleId
  });
  return sendEmail({ to: coAuthorEmail, subject, html });
}

export async function sendAuthorAssignmentNotification(authorEmail: string, authorName: string, articleTitle: string, articleId: string) {
  const { subject, html } = generateAuthorAssignmentHtml({
    authorName,
    articleTitle,
    articleId
  });
  return sendEmail({ to: authorEmail, subject, html });
}

export async function sendEditorAssignmentNotification(editorEmail: string, editorName: string, articleTitle: string, authorName: string, category: string, articleId: string) {
  const { subject, html } = generateEditorTaskAssignedHtml({
    editorName,
    articleTitle,
    authorName,
    category,
    articleId
  });
  return sendEmail({ to: editorEmail, subject, html });
}

export async function sendArticleApprovalNotification(authorEmail: string, authorName: string, articleTitle: string, articleId: string) {
  const { subject, html } = generateArticleApprovalHtml({
    authorName,
    articleTitle,
    articleId
  });
  return sendEmail({ to: authorEmail, subject, html });
}

export async function sendArticleCorrectionNotification(authorEmail: string, authorName: string, articleTitle: string, articleId: string, editorComments?: string) {
  const { subject, html } = generateArticleCorrectionHtml({
    authorName,
    articleTitle,
    articleId,
    ...(editorComments && { editorComments })
  });
  return sendEmail({ to: authorEmail, subject, html });
}

// --- EMAIL VERIFICATION FOR ARTICLE SUBMISSION ---
export async function sendArticleVerificationEmail(
  authorEmail: string,
  authorName: string,
  token: string
) {
  const { subject, html } = generateArticleVerificationHtml({
    authorName,
    token,
    backendUrl: process.env.BACKEND_URL || 'http://localhost:4000'
  });
  return sendEmail({ to: authorEmail, subject, html });
}

// --- EMAIL VERIFICATION WITH CODE FOR ARTICLE SUBMISSION ---
export async function sendArticleVerificationCodeEmail(
  authorEmail: string,
  authorName: string,
  code: string
) {
  const { subject, html } = generateArticleVerificationCodeHtml({
    authorName,
    code
  });
  return sendEmail({ to: authorEmail, subject, html });
}

// --- EDITOR INVITATION EMAIL ---
export async function sendEditorInvitationEmail(
  editorEmail: string,
  editorName: string,
  token: string
) {
  const { subject, html } = generateEditorInvitationHtml({
    editorName,
    token,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  });
  return sendEmail({ to: editorEmail, subject, html });
}

/**
 * Send notification to admin when editor approves article
 */
export async function sendEditorApprovalNotificationToAdmin(
  adminEmail: string,
  adminName: string,
  articleTitle: string,
  editorName: string,
  articleId: string
) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const reviewUrl = `${frontendUrl}/admin/articles/${articleId}/review`;
  const changeHistoryUrl = `${frontendUrl}/articles/${articleId}/change-history`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #27ae60; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
        .button-secondary { background-color: #3498db; }
        .footer { text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 12px; }
        .highlight { background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📢 Article Ready for Publishing</h1>
        </div>
        <div class="content">
          <p>Dear ${adminName},</p>
          
          <div class="highlight">
            <strong>Editor ${editorName}</strong> has approved the article <strong>"${articleTitle}"</strong>.
          </div>
          
          <p>The article is now ready for your final review and publishing.</p>
          
          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Review the article and changes made by the editor</li>
            <li>View the change history to see what was modified</li>
            <li>Publish the article when ready</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewUrl}" class="button">Review & Publish Article</a>
            <a href="${changeHistoryUrl}" class="button button-secondary">View Change History</a>
          </div>
          
          <p style="color: #7f8c8d; font-size: 14px;">
            <strong>Note:</strong> You can now publish this article from the admin dashboard.
          </p>
        </div>
        <div class="footer">
          <p>This is an automated notification from Law Nation</p>
          <p>© ${new Date().getFullYear()} Law Nation. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: adminEmail,
    subject: `Article Ready for Publishing - ${articleTitle}`,
    html,
  });
}

/**
 * Send notification to uploader when article is published (with link to change history)
 */
export async function sendArticlePublishedNotification(
  uploaderEmail: string,
  uploaderName: string,
  articleTitle: string,
  articleId: string
) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const articleUrl = `${frontendUrl}/articles/${articleId}`;
  const changeHistoryUrl = `${frontendUrl}/articles/${articleId}/change-history`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #27ae60; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #27ae60; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
        .button-secondary { background-color: #3498db; }
        .footer { text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 12px; }
        .success-box { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }
        .info-box { background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Your Article Has Been Published!</h1>
        </div>
        <div class="content">
          <p>Dear ${uploaderName},</p>
          
          <div class="success-box">
            <h2 style="margin: 0; color: #155724;">Great News!</h2>
            <p style="margin: 10px 0 0 0;">Your article <strong>"${articleTitle}"</strong> has been published.</p>
          </div>
          
          <p>Thank you for your valuable contribution to Law Nation. Your article is now live and accessible to our readers.</p>
          
          <div class="info-box">
            <p style="margin: 0;"><strong>📝 Want to see what changed?</strong></p>
            <p style="margin: 5px 0 0 0;">View the change history to see any edits made during the review process.</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${articleUrl}" class="button">Read Your Published Article</a>
            <a href="${changeHistoryUrl}" class="button button-secondary">View Change History</a>
          </div>
          
          <p style="color: #7f8c8d; font-size: 14px;">
            <strong>Share your article:</strong> You can now share your published article with colleagues and on social media.
          </p>
        </div>
        <div class="footer">
          <p>Thank you for contributing to Law Nation</p>
          <p>© ${new Date().getFullYear()} Law Nation. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: uploaderEmail,
    subject: `Your Article Has Been Published - ${articleTitle}`,
    html,
  });
}
