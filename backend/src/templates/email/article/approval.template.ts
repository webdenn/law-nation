import { wrapInSimpleRedLayout } from '../shared/layout.template.js';

export function generateArticleApprovalHtml(data: {
  authorName: string;
  articleTitle: string;
  articleId: string;
}): { subject: string; html: string } {
  const content = `
    <div style="padding: 30px;">
      <h2 style="color: #2e7d32; text-align: center;">🎉 Congratulations!</h2>
      <p>Dear ${data.authorName},</p>
      <p>We are pleased to inform you that your article <strong>"${data.articleTitle}"</strong> has been approved and published on Law Nation.</p>
      <p style="font-size: 14px; color: #666;"><b>Article ID:</b> ${data.articleId}</p>
      <p style="font-size: 13px; color: #777; margin-top: 20px;">
        Your contribution to legal scholarship is greatly appreciated.
      </p>
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
      <div style="font-size: 13px; color: #777;">
        <p style="margin: 0;">Regards,</p>
        <p style="margin: 5px 0; font-weight: bold; color: #d32f2f;">Executive Team, Law Nation</p>
      </div>
    </div>
  `;

  return {
    subject: "Article Approved and Published - Law Nation",
    html: wrapInSimpleRedLayout(content)
  };
}
