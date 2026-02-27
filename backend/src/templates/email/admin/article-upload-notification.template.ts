import { wrapInRedLayout } from "../shared/layout.template.js";

export function generateArticleUploadNotificationHtml(data: {
  adminName: string;
  uploaderName: string;
  uploaderEmail: string;
  articleTitle: string;
  articleId: string;
  category?: string;
  organization?: string;
  frontendUrl?: string;
}): { subject: string; html: string } {
  const frontendUrl = data.frontendUrl || process.env.FRONTEND_URL || "http://localhost:3000";
  
  const content = `
    <div style="margin-bottom: 30px;">
      <h2 style="color: #2c3e50; margin-bottom: 20px;">New Article Submission</h2>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        Dear ${data.adminName},
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        A new article has been submitted to Law Nation and is awaiting admin review.
      </p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2c3e50; margin-bottom: 15px;">Submission Details</h3>
        <p style="margin: 8px 0;"><strong>Article Title:</strong> ${data.articleTitle}</p>
        <p style="margin: 8px 0;"><strong>Author:</strong> ${data.uploaderName}</p>
        <p style="margin: 8px 0;"><strong>Author Email:</strong> ${data.uploaderEmail}</p>
        ${data.category ? `<p style="margin: 8px 0;"><strong>Category:</strong> ${data.category}</p>` : ''}
        ${data.organization ? `<p style="margin: 8px 0;"><strong>Organization:</strong> ${data.organization}</p>` : ''}
        <p style="margin: 8px 0;"><strong>Article ID:</strong> ${data.articleId}</p>
        <p style="margin: 8px 0;"><strong>Status:</strong> Pending Admin Review</p>
      </div>
      
      <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #1e40af;">
          <strong>Next Steps:</strong> Please review the article and assign an Stage 1 Review to begin the Stage 1 Review  process.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/admin/articles/${data.articleId}" 
           style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
          Review Article
        </a>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        This is an automated notification from the LAW NATION submission system.
      </p>
    </div>
  `;

  return {
    subject: `New Article Submission - ${data.articleTitle}`,
    html: wrapInRedLayout(content)
  };
}