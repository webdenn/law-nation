import { wrapInRedLayout } from "../shared/layout.template.js";

export function reviewerAssignmentTemplate(
  adminName: string,
  reviewerName: string,
  articleTitle: string,
  articleId: string,
  frontendUrl: string
): string {
  const subject = `Stage 2 Review Assigned - ${articleTitle}`;
  
  const content = `
    <div style="margin-bottom: 30px;">
      <h2 style="color: #2c3e50; margin-bottom: 20px;">Stage 2 Review Assignment Notification</h2>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        Dear Admin,
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Stage 2 Review has been assigned to review an article after Stage 1 Review approval.
      </p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2c3e50; margin-bottom: 15px;">Assignment Details</h3>
        <p style="margin: 8px 0;"><strong>Article:</strong> ${articleTitle}</p>
        <p style="margin: 8px 0;"><strong>Assigned Stage 2 Review:</strong> ${reviewerName}</p>
        <p style="margin: 8px 0;"><strong>Status:</strong>Stage 2 Review</p>
      </div>
      
      <div style="background-color: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #1e40af;">
          <strong>Next Steps:</strong> The Stage 2 Review will now review the Stage 1 Review work and may make additional corrections before final approval.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/admin/articles/${articleId}" 
           style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
          View Article Details
        </a>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        This is an automated notification from the LAW NATION editorial system.
      </p>
    </div>
  `;

  return wrapInRedLayout(content);
}