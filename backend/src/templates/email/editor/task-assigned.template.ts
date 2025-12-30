import { wrapInSimpleRedLayout } from '../shared/layout.template.js';

export function generateEditorTaskAssignedHtml(data: {
  editorName: string;
  articleTitle: string;
  authorName: string;
  category: string;
  articleId: string;
}): { subject: string; html: string } {
  const content = `
    <div style="padding: 30px;">
      <h3 style="color: #d32f2f;">New Review Task Assigned</h3>
      <p>Dear ${data.editorName},</p>
      <p>A new article has been assigned to you for review.</p>
      
      <div style="background-color: #f5f5f5; border-left: 4px solid #d32f2f; padding: 15px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Article Title:</strong> ${data.articleTitle}</p>
        <p style="margin: 5px 0;"><strong>Author:</strong> ${data.authorName}</p>
        <p style="margin: 5px 0;"><strong>Category:</strong> ${data.category}</p>
        <p style="margin: 5px 0;"><strong>Article ID:</strong> ${data.articleId}</p>
      </div>
      
      <p style="font-size: 13px; color: #777; margin-top: 20px;">
        Please log in to your editor dashboard to review and provide feedback.
      </p>
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
      <div style="font-size: 13px; color: #777;">
        <p style="margin: 0;">Regards,</p>
        <p style="margin: 5px 0; font-weight: bold; color: #d32f2f;">Executive Team, Law Nation</p>
      </div>
    </div>
  `;

  return {
    subject: "New Review Task Assigned - Law Nation",
    html: wrapInSimpleRedLayout(content)
  };
}
