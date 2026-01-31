import { wrapInSimpleRedLayout } from "../shared/layout.template.js";

interface PasswordResetTemplateData {
  userName: string;
  resetToken: string;
  frontendUrl: string;
  expiryMinutes?: number;
}

export function generatePasswordResetHtml(data: PasswordResetTemplateData) {
  const { userName, resetToken, frontendUrl, expiryMinutes = 30 } = data;

  const resetUrl = `${frontendUrl}/law/reset-password?token=${resetToken}`;

  const subject = "Reset Your Law Nation Password";

  const content = `
    <div style="text-align: center; padding: 40px 20px;">
      <h1 style="color: #1a365d; margin-bottom: 30px; font-size: 28px;">
        Password Reset Request
      </h1>
      
      <div style="background-color: #f7fafc; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
        <p style="color: #2d3748; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Hello <strong>${userName}</strong>,
        </p>
        
        <p style="color: #2d3748; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
          We received a request to reset your password for your Law Nation account. 
          Click the button below to create a new password:
        </p>
        
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #3182ce; color: white; padding: 15px 30px; 
                    text-decoration: none; border-radius: 6px; font-weight: 600; 
                    font-size: 16px; display: inline-block;">
            Reset My Password
          </a>
        </div>
        
        <div style="background-color: #fed7d7; border: 1px solid #fc8181; border-radius: 6px; padding: 15px; margin: 25px 0;">
          <p style="color: #c53030; font-size: 14px; margin: 0; font-weight: 600;">
            ⏰ This link will expire in ${expiryMinutes} minutes
          </p>
        </div>
        
        <p style="color: #718096; font-size: 14px; line-height: 1.5; margin-top: 25px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="color: #3182ce; font-size: 14px; word-break: break-all; margin: 10px 0;">
          ${resetUrl}
        </p>
      </div>
      
      <div style="background-color: #edf2f7; padding: 20px; border-radius: 6px; margin-top: 30px;">
        <h3 style="color: #2d3748; font-size: 16px; margin-bottom: 15px;">
          🔒 Security Notice
        </h3>
        <ul style="color: #4a5568; font-size: 14px; text-align: left; line-height: 1.6; margin: 0; padding-left: 20px;">
          <li>If you didn't request this password reset, please ignore this email</li>
          <li>Never share this reset link with anyone</li>
          <li>This link can only be used once</li>
          <li>For security questions, contact our support team</li>
        </ul>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p style="color: #718096; font-size: 12px; margin: 0;">
          This email was sent from Law Nation. If you have any questions, 
          please contact our support team.
        </p>
      </div>
    </div>
  `;

  const html = wrapInSimpleRedLayout(content, "Law Nation - Legal Research Platform");

  return { subject, html };
}