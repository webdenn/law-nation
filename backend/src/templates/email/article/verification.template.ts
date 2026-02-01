import { wrapInSimpleRedLayout } from '../shared/layout.template.js';

export function generateArticleVerificationHtml(data: {
  authorName: string;
  token: string;
  backendUrl: string;
}): { subject: string; html: string } {
  const verificationUrl = `${data.backendUrl}/api/articles/verify/${data.token}`;
  
  const content = `
    <div style="padding: 30px;">
      <h3 style="color: #d32f2f;">Verify Your Article Submission</h3>
      <p>Dear ${data.authorName},</p>
      <p>Thank you for submitting your article to Law Nation. Please verify your email address to complete the submission.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" 
           style="background-color: #d32f2f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          VERIFY EMAIL
        </a>
      </div>
      
      <p style="font-size: 14px; color: #666; background-color: #fff3cd; padding: 10px; border-left: 3px solid #ffc107; margin: 20px 0;">
        ⏰ <strong>Important:</strong> This verification link will expire in <strong>48 hours</strong>.
      </p>
      
      <p style="font-size: 12px; color: #666;">
        If you didn't submit this article, please ignore this email. The submission will be automatically deleted after 48 hours.
      </p>
      
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
      
      <p style="font-size: 11px; color: #999;">
        Or copy and paste this link into your browser:<br>
        <span style="word-break: break-all;">${verificationUrl}</span>
      </p>
    </div>
  `;

  return {
    subject: "Verify Your Article Submission - Law Nation (Valid for 48 Hours)",
    html: wrapInSimpleRedLayout(content, "Law Nation © 2025 | This link is valid for 48 hours")
  };
}
