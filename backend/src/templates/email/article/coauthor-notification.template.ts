import { wrapInSimpleRedLayout } from '../shared/layout.template.js';

export function generateCoAuthorNotificationHtml(data: {
  coAuthorName: string;
  primaryAuthorName: string;
  articleTitle: string;
  articleId: string;
}): { subject: string; html: string } {
  const content = `
    <div style="padding: 30px;">
      <h3 style="color: #d32f2f;">You've Been Added as Co-Author</h3>
      <p>Dear ${data.coAuthorName},</p>
      <p>You have been added as a co-author on the following article submission:</p>
      
      <div style="background-color: #f5f5f5; border-left: 4px solid #d32f2f; padding: 15px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Article Title:</strong> ${data.articleTitle}</p>
        <p style="margin: 5px 0;"><strong>Primary Author:</strong> ${data.primaryAuthorName}</p>
        <p style="margin: 5px 0;"><strong>Article ID:</strong> ${data.articleId}</p>
      </div>
      
      <p style="font-size: 13px; color: #777; margin-top: 20px;">
        You will receive updates about the article's review status. No action is required from you at this time.
      </p>
      
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
      <div style="font-size: 13px; color: #777;">
        <p style="margin: 0;">Regards,</p>
        <p style="margin: 5px 0; font-weight: bold; color: #d32f2f;">Executive Team, Law Nation</p>
      </div>
    </div>
  `;

  return {
    subject: "You've Been Added as Co-Author - Law Nation",
    html: wrapInSimpleRedLayout(content)
  };
}
