import { wrapInRedLayout } from "../shared/layout.template.js";

interface AccessRemovalNotificationData {
  userName: string;
  userType: 'EDITOR' | 'REVIEWER';
  removalDate: string;
  reason?: string;
  adminName: string;
  supportEmail: string;
}

export function generateAccessRemovalNotificationHtml(data: AccessRemovalNotificationData): { subject: string; html: string } {
  const content = `
    <div style="padding: 30px 20px;">
      
      <!-- Greeting -->
      <p style="font-size: 16px; margin-bottom: 20px;">
        Dear ${data.userName},
      </p>

      <!-- Main Message -->
      <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 20px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 16px; font-weight: 500;">
          Your ${data.userType.toLowerCase()} access to the Law-Nation management portal has been removed.
        </p>
      </div>

      <!-- Details -->
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0; font-size: 18px;">Removal Details:</h3>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li><strong>User Type:</strong> ${data.userType}</li>
          <li><strong>Removal Date:</strong> ${data.removalDate}</li>
          <li><strong>Removed By:</strong> ${data.adminName}</li>
          ${data.reason ? `<li><strong>Reason:</strong> ${data.reason}</li>` : ''}
        </ul>
      </div>

      <!-- What This Means -->
      <div style="margin: 30px 0;">
        <h3 style="color: #333; font-size: 18px;">What this means:</h3>
        <ul style="margin: 10px 0; padding-left: 20px; color: #666;">
          <li>You will no longer be able to log into the management portal</li>
          <li>Any pending article assignments have been reassigned</li>
          <li>Your previous work and contributions remain in the system</li>
          <li>This action is effective immediately</li>
        </ul>
      </div>

      <!-- Contact Information -->
      <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 30px 0; border-radius: 4px;">
        <h3 style="color: #1976d2; margin-top: 0; font-size: 18px;">Questions or Concerns?</h3>
        <p style="margin: 10px 0; color: #666;">
          If you believe this action was taken in error or if you have any questions, 
          please contact our support team immediately.
        </p>
        <p style="margin: 10px 0;">
          <strong>Support Email:</strong> 
          <a href="mailto:${data.supportEmail}" style="color: #1976d2; text-decoration: none;">
            ${data.supportEmail}
          </a>
        </p>
      </div>

      <!-- Closing -->
      <p style="font-size: 16px; margin-top: 30px;">
        Thank you for your contributions to Law-Nation.
      </p>

      <p style="font-size: 16px; margin-top: 20px;">
        Best regards,<br>
        <strong>Law-Nation Administration Team</strong>
      </p>

    </div>
  `;

  return {
    subject: `Access Removal Notification - ${data.userType}`,
    html: wrapInRedLayout(content)
  };
}

export default generateAccessRemovalNotificationHtml;