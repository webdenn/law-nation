import { wrapInSimpleRedLayout } from '../shared/layout.template.js';

export function generateReviewerReassignmentNotificationHtml(data: {
  reviewerName: string;
  articleTitle: string;
  articleId: string;
}): { subject: string; html: string } {
  const content = `
    <div style="padding: 30px;">
      <h3 style="color: #d32f2f;">Review Assignment Update</h3>
      <p>Dear ${data.reviewerName},</p>
      
      <p>We wanted to inform you that the article <strong>"${data.articleTitle}"</strong> has been reassigned to another Stage 2 Review .</p>
      
      <div style="background-color: #f8f9fa; border-left: 4px solid #6c757d; padding: 15px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Article:</strong> ${data.articleTitle}</p>
        <p style="margin: 5px 0;"><strong>Article ID:</strong> ${data.articleId}</p>
        <p style="margin: 5px 0;"><strong>Status:</strong> Reassigned to another reviewer</p>
      </div>
      
      <p>Thank you for your time and consideration. We appreciate your continued support as a Stage 2 Review  for Law Nation.</p>
      
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
      <div style="font-size: 13px; color: #777;">
        <p style="margin: 0;">Regards,</p>
        <p style="margin: 5px 0; font-weight: bold; color: #d32f2f;">Executive Team, Law Nation</p>
      </div>
    </div>
  `;

  return {
    subject: `Stage 2 Review Assignment Update - ${data.articleTitle}`,
    html: wrapInSimpleRedLayout(content)
  };
}