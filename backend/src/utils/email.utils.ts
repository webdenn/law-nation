import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(options: EmailOptions) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "noreply@lawnation.com",
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log(`Email sent to ${options.to}`);
  } catch (error) {
    console.error("Email send error:", error);
    throw error;
  }
}

// ARTICLE EMAIL TEMPLATES

export async function sendArticleSubmissionConfirmation(
  authorEmail: string,
  authorName: string,
  articleTitle: string,
  articleId: string
) {
  return sendEmail({
    to: authorEmail,
    subject: "Article Submission Received",
    html: `
      <h2>Thank you for your submission!</h2>
      <p>Dear ${authorName},</p>
      <p>We have received your article: <strong>${articleTitle}</strong></p>
      <p>Article ID: ${articleId}</p>
      <p>Status: Pending Admin Review</p>
      <p>You will receive updates via email as your article progresses through the review process.</p>
    `,
  }).catch((err) => console.error("Email send failed:", err));
}

export async function sendEditorAssignmentNotification(
  editorEmail: string,
  editorName: string,
  articleTitle: string,
  authorName: string,
  category: string,
  articleId: string
) {
  return sendEmail({
    to: editorEmail,
    subject: "New Article Assigned for Review",
    html: `
      <h2>New Article Assignment</h2>
      <p>Dear ${editorName},</p>
      <p>You have been assigned to review the following article:</p>
      <ul>
        <li><strong>Title:</strong> ${articleTitle}</li>
        <li><strong>Author:</strong> ${authorName}</li>
        <li><strong>Category:</strong> ${category}</li>
        <li><strong>Article ID:</strong> ${articleId}</li>
      </ul>
      <p>Please review and take appropriate action.</p>
    `,
  }).catch((err) => console.error("Email send failed:", err));
}

export async function sendAuthorAssignmentNotification(
  authorEmail: string,
  authorName: string,
  articleTitle: string,
  articleId: string
) {
  return sendEmail({
    to: authorEmail,
    subject: "Article Assigned to Editor",
    html: `
      <h2>Article Status Update</h2>
      <p>Dear ${authorName},</p>
      <p>Your article "<strong>${articleTitle}</strong>" has been assigned to an editor for review.</p>
      <p>Article ID: ${articleId}</p>
      <p>Status: Assigned to Editor</p>
    `,
  }).catch((err) => console.error("Email send failed:", err));
}

export async function sendArticleApprovalNotification(
  authorEmail: string,
  authorName: string,
  articleTitle: string,
  articleId: string
) {
  return sendEmail({
    to: authorEmail,
    subject: "Article Approved and Published",
    html: `
      <h2>Congratulations!</h2>
      <p>Dear ${authorName},</p>
      <p>Your article "<strong>${articleTitle}</strong>" has been approved and published.</p>
      <p>Article ID: ${articleId}</p>
      <p>Status: Approved & Published</p>
      <p>Thank you for your contribution!</p>
    `,
  }).catch((err) => console.error("Email send failed:", err));
}

export async function sendArticleCorrectionNotification(
  authorEmail: string,
  authorName: string,
  articleTitle: string,
  articleId: string,
  editorComments?: string
) {
  return sendEmail({
    to: authorEmail,
    subject: "Article Corrected by Editor",
    html: `
      <h2>Article Update</h2>
      <p>Dear ${authorName},</p>
      <p>Your article "<strong>${articleTitle}</strong>" has been corrected by the editor.</p>
      <p>Article ID: ${articleId}</p>
      <p>Status: Pending Final Approval</p>
      ${editorComments ? `<p><strong>Editor Comments:</strong> ${editorComments}</p>` : ""}
      <p>The article is now pending final approval.</p>
    `,
  }).catch((err) => console.error("Email send failed:", err));
}
