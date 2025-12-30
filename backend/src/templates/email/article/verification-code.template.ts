import { wrapInSimpleRedLayout } from '../shared/layout.template.js';

export function generateArticleVerificationCodeHtml(data: {
  authorName: string;
  code: string;
}): { subject: string; html: string } {
  const content = `
    <div style="padding: 30px;">
      <h3 style="color: #d32f2f;">Verify Your Article Submission</h3>
      <p>Dear ${data.authorName},</p>
      <p>Thank you for submitting your article to Law Nation. Please enter this verification code to complete your submission:</p>
      
      <div style="background-color: #f5f5f5; border: 2px dashed #d32f2f; border-radius: 8px; padding: 30px; margin: 30px 0; text-align: center;">
        <div style="font-size: 48px; font-weight: bold; color: #d32f2f; letter-spacing: 10px; font-family: 'Courier New', monospace;">
          ${data.code}
        </div>
      </div>
      
      <p style="font-size: 14px; color: #666; background-color: #fff3cd; padding: 10px; border-left: 3px solid #ffc107; margin: 20px 0;">
        ⏰ <strong>Important:</strong> This code will expire in <strong>48 hours</strong>.
      </p>
      
      <p style="font-size: 12px; color: #666;">
        If you didn't submit this article, please ignore this email. The submission will be automatically deleted after 48 hours.
      </p>
      
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
      
      <div style="font-size: 13px; color: #777;">
        <p style="margin: 0;">Regards,</p>
        <p style="margin: 5px 0; font-weight: bold; color: #d32f2f;">Executive Team, Law Nation</p>
      </div>
    </div>
  `;

  return {
    subject: "Verify Your Article Submission - Law Nation (Code: " + data.code + ")",
    html: wrapInSimpleRedLayout(content, "Law Nation © 2025 | This code is valid for 48 hours")
  };
}
