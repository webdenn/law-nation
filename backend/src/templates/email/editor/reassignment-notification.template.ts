import { wrapInRedLayout } from '../shared/layout.template.js';

export function generateEditorReassignmentNotificationHtml(data: {
  editorName: string;
  articleTitle: string;
  articleId: string;
}): { subject: string; html: string } {
  const content = `
    <div style="padding: 40px 30px; color: #333; line-height: 1.8;">
      <h2 style="color: #d32f2f; font-size: 26px; margin-bottom: 20px;">Article Reassignment Notice</h2>
      
      <p style="font-size: 17px; color: #444;">
        Dear <strong>${data.editorName}</strong>,
      </p>
      
      <p style="font-size: 16px; color: #555; line-height: 1.8;">
        We would like to inform you that the article <strong>"${data.articleTitle}"</strong> 
        has been reassigned to another editor.
      </p>
      
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
        <p style="margin: 0; color: #856404; font-size: 15px;">
          <strong>⚠️ Important:</strong> You no longer have access to review or edit this article.
        </p>
      </div>
      
      <p style="font-size: 15px; color: #666; line-height: 1.8;">
        This is a normal part of our editorial process and does not reflect on your work. 
        Reassignments may occur due to workload balancing, specialization requirements, or other administrative reasons.
      </p>
      
      <p style="font-size: 15px; color: #666; line-height: 1.8;">
        If you have any questions or concerns about this reassignment, please feel free to contact the administrative team.
      </p>
      
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">
      
      <div style="font-size: 13px; color: #777;">
        <p style="margin: 0;">Best regards,</p>
        <p style="margin: 5px 0; font-weight: bold; color: #d32f2f;">Editorial Team, Law Nation</p>
      </div>
    </div>
  `;

  return {
    subject: `Article Reassignment Notice - ${data.articleTitle}`,
    html: wrapInRedLayout(content)
  };
}
