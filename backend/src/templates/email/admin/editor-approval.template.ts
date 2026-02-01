import { wrapInSimpleRedLayout } from '../shared/layout.template.js';

export function generateEditorApprovalNotificationHtml(data: {
  adminName: string;
  articleTitle: string;
  editorName: string;
  articleId: string;
}): { subject: string; html: string } {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const reviewUrl = `${frontendUrl}/admin/articles/${data.articleId}/review`;
  const changeHistoryUrl = `${frontendUrl}/articles/${data.articleId}/change-history`;

  const content = `
    <div style="padding: 30px;">
      <h2 style="color: #2c3e50; text-align: center;">📢 Article Ready for Publishing</h2>
      
      <p>Dear ${data.adminName},</p>
      
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #856404;">
          Editor <strong>${data.editorName}</strong> has approved the article <strong>"${data.articleTitle}"</strong>.
        </p>
      </div>
      
      <p>The article is now ready for your final review and publishing.</p>
      
      <p><strong>Next Steps:</strong></p>
      <ul style="color: #555; line-height: 1.8;">
        <li>Review the article and changes made by the editor</li>
        <li>View the change history to see what was modified</li>
        <li>Publish the article when ready</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${reviewUrl}" 
           style="display: inline-block; 
                  padding: 12px 30px; 
                  background-color: #27ae60; 
                  color: white; 
                  text-decoration: none; 
                  border-radius: 5px; 
                  margin: 10px 5px;
                  font-weight: bold;">
          Review & Publish Article
        </a>
        <a href="${changeHistoryUrl}" 
           style="display: inline-block; 
                  padding: 12px 30px; 
                  background-color: #3498db; 
                  color: white; 
                  text-decoration: none; 
                  border-radius: 5px; 
                  margin: 10px 5px;
                  font-weight: bold;">
          View Change History
        </a>
      </div>
      
      <p style="color: #7f8c8d; font-size: 14px; margin-top: 20px;">
        <strong>Note:</strong> You can now publish this article from the admin dashboard.
      </p>

      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
      <div style="font-size: 13px; color: #777;">
        <p style="margin: 0;">This is an automated notification from Law Nation</p>
        <p style="margin: 5px 0; font-weight: bold; color: #d32f2f;">Executive Team, Law Nation</p>
      </div>
    </div>
  `;

  return {
    subject: `Article Ready for Publishing - ${data.articleTitle}`,
    html: wrapInSimpleRedLayout(content, `Law Nation © ${new Date().getFullYear()} | Admin Notification`)
  };
}
