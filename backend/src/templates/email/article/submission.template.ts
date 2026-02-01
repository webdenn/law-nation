import { wrapInSimpleRedLayout } from '../shared/layout.template.js';

export function generateArticleSubmissionHtml(data: {
  authorName: string;
  articleTitle: string;
  articleId: string;
}): { subject: string; html: string } {
  const content = `
    <div style="padding: 30px;">
      <h3 style="color: #d32f2f; border-bottom: 2px solid #f44336; padding-bottom: 10px;">Submission Received</h3>
      <p>Dear ${data.authorName},</p>
      <p>Your article <b>"${data.articleTitle}"</b> has been received for review.</p>
      <p style="font-size: 14px; color: #666;"><b>Article ID:</b> ${data.articleId}</p>
      <p style="font-size: 13px; color: #777; margin-top: 20px;">
        You will be notified once the review process begins.
      </p>
    </div>
  `;

  return {
    subject: "Article Received - Law Nation",
    html: wrapInSimpleRedLayout(content)
  };
}
