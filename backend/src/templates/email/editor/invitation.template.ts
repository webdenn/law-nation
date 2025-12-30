import { wrapInRedLayout } from '../shared/layout.template.js';

export function generateEditorInvitationHtml(data: {
  editorName: string;
  token: string;
  frontendUrl: string;
}): { subject: string; html: string } {
  const setupPasswordUrl = `${data.frontendUrl}/law/setup-password?token=${data.token}`;
  
  const content = `
    <div style="padding: 40px 30px; color: #333; line-height: 1.8;">
      <h2 style="color: #d32f2f; font-size: 26px; margin-bottom: 20px; text-align: center;">Welcome to Law Nation!</h2>
      
      <p style="font-size: 17px; color: #444;">
        Dear <strong>${data.editorName}</strong>,
      </p>
      
      <p style="font-size: 16px; color: #555; line-height: 1.8;">
        You have been invited to join <strong>Law Nation</strong> as an <strong style="color: #d32f2f;">Editor</strong>. 
        We are excited to have you on our team to review and approve scholarly legal articles.
      </p>
      
      <div style="background-color: #f5f5f5; border-left: 4px solid #d32f2f; padding: 20px; margin: 25px 0;">
        <p style="margin: 0; font-size: 15px; color: #333;">
          <strong>Next Step:</strong> Click the button below to set up your password and activate your editor account.
        </p>
      </div>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${setupPasswordUrl}" 
           style="background-color: #d32f2f; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          SET UP PASSWORD
        </a>
      </div>
      
      <p style="font-size: 14px; color: #666; background-color: #fff3cd; padding: 12px; border-left: 3px solid #ffc107; margin: 25px 0;">
        ⏰ <strong>Important:</strong> This invitation link will expire in <strong>48 hours</strong>. Please complete your registration before the deadline.
      </p>
      
      <p style="font-size: 13px; color: #777;">
        Once your password is set, you can log in and start reviewing articles assigned to you.
      </p>
      
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">
      
      <p style="font-size: 11px; color: #999;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <span style="word-break: break-all; color: #d32f2f;">${setupPasswordUrl}</span>
      </p>
      
      <p style="font-size: 12px; color: #999; margin-top: 20px;">
        If you didn't expect this invitation, please ignore this email. The invitation will automatically expire after 48 hours.
      </p>
      
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">
      
      <div style="font-size: 13px; color: #777; text-align: center;">
        <p style="margin: 0;">Regards,</p>
        <p style="margin: 5px 0; font-weight: bold; color: #d32f2f;">Executive Team, Law Nation</p>
      </div>
    </div>
  `;

  return {
    subject: "You're Invited to Join Law Nation as an Editor! ⚖️",
    html: wrapInRedLayout(content)
  };
}
