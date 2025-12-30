import { wrapInRedLayout } from '../shared/layout.template.js';

export function generateOtpEmailHtml(data: {
  otp: string;
}): { subject: string; html: string } {
  const content = `
    <div style="padding: 40px 30px; color: #333; line-height: 1.8; text-align: center;">
      <h2 style="color: #d32f2f; font-size: 26px; margin-bottom: 20px;">Verify Your Email</h2>
      
      <p style="font-size: 17px; color: #444;">
        Enter this verification code to complete your registration:
      </p>
      
      <div style="background-color: #f5f5f5; border: 2px dashed #d32f2f; border-radius: 8px; padding: 20px; margin: 30px 0;">
        <div style="font-size: 42px; font-weight: bold; color: #d32f2f; letter-spacing: 8px; font-family: 'Courier New', monospace;">
          ${data.otp}
        </div>
      </div>
      
      <p style="font-size: 14px; color: #666; background-color: #fff3cd; padding: 10px; border-left: 3px solid #ffc107; margin: 20px 0;">
        ⏰ <strong>Important:</strong> This code will expire in <strong>10 minutes</strong>.
      </p>
      
      <p style="font-size: 13px; color: #999; margin-top: 30px;">
        If you didn't request this code, please ignore this email.
      </p>
      
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">
      
      <div style="font-size: 13px; color: #777;">
        <p style="margin: 0;">Regards,</p>
        <p style="margin: 5px 0; font-weight: bold; color: #d32f2f;">Executive Team, Law Nation</p>
      </div>
    </div>
  `;

  return {
    subject: "Your Email Verification Code - Law Nation",
    html: wrapInRedLayout(content)
  };
}
