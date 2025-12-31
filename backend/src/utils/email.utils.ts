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
import { generateArticlePublishedHtml } from "@/templates/email/article/published.template.js";
import { generateEditorApprovalNotificationHtml } from "@/templates/email/admin/editor-approval.template.js";

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
  const { subject, html } = generateEditorApprovalNotificationHtml({
    adminName,
    articleTitle,
    editorName,
    articleId
  });

  await sendEmail({
    to: adminEmail,
    subject,
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
  articleId: string,
  diffSummary?: string
) {
  const { subject, html } = generateArticlePublishedHtml({
    authorName: uploaderName,
    articleTitle,
    articleId,
    ...(diffSummary && { diffSummary })
  });

  await sendEmail({
    to: uploaderEmail,
    subject,
    html,
  });
}
