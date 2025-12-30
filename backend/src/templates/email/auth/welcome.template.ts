import { wrapInRedLayout } from '../shared/layout.template.js';

export function generateWelcomeEmailHtml(data: {
  userName: string;
  frontendUrl: string;
}): { subject: string; html: string } {
  const content = `
    <div style="padding: 40px 30px; color: #333; line-height: 1.8; text-align: center;">
      <h2 style="color: #d32f2f; font-size: 26px; margin-bottom: 20px;">Registration Successful</h2>
      
      <p style="font-size: 17px; color: #444;">
        We are honored to welcome you to <b>Law Nation Prime Times</b>. Your gateway to premium legal scholarships and expert research analysis is now active.
      </p>
      
      <div style="margin: 35px 0;">
        <a href="${data.frontendUrl}/law/home" style="background-color: #d32f2f; color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">ACCESS PORTAL</a>
      </div>
      
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 30px 0;">
      
      <div style="font-size: 13px; color: #777;">
        <p style="margin: 0;">Regards,</p>
        <p style="margin: 5px 0; font-weight: bold; color: #d32f2f;">Executive Team, Law Nation</p>
      </div>
    </div>
  `;

  return {
    subject: "Welcome to Law Nation! ⚖️",
    html: wrapInRedLayout(content)
  };
}
