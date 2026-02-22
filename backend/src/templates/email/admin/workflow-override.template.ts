import { wrapInRedLayout } from "../shared/layout.template.js";

export function workflowOverrideTemplate(
  adminName: string,
  articleTitle: string,
  articleId: string,
  overrideReason: string,
  frontendUrl: string
): string {
  const subject = `Admin Override - Article Published Directly - ${articleTitle}`;
  
  const content = `
    <div style="margin-bottom: 30px;">
      <h2 style="color: #dc2626; margin-bottom: 20px;">Admin Workflow Override Notification</h2>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        Dear Admin Team,
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        An article has been published directly by admin, bypassing the standard Stage 1/2 Review workflow.
      </p>
      
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <h3 style="color: #dc2626; margin-bottom: 15px;">Override Details</h3>
        <p style="margin: 8px 0;"><strong>Article:</strong> ${articleTitle}</p>
        <p style="margin: 8px 0;"><strong>Admin:</strong> ${adminName}</p>
        <p style="margin: 8px 0;"><strong>Action:</strong> Direct Publication (Workflow Override)</p>
        <p style="margin: 8px 0;"><strong>Reason:</strong> ${overrideReason}</p>
      </div>
      
      <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e;">
          <strong>Note:</strong> This article was published without going through the standard Stage 1/2 Review approval process. 
          Please ensure this action was authorized and documented appropriately.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/admin/articles/${articleId}" 
           style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
          Review Published Article
        </a>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        This is an automated notification from the LAW NATION editorial system for audit and compliance purposes.
      </p>
    </div>
  `;

  return wrapInRedLayout(content);
}
