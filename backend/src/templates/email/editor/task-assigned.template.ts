import { wrapInSimpleRedLayout } from '../shared/layout.template.js';

export function generateEditorTaskAssignedHtml(data: {
  editorName: string;
  articleTitle: string;
  authorName: string;
  category: string;
  articleId: string;
  frontendUrl: string;
}): { subject: string; html: string } {
  const reviewUrl = `${data.frontendUrl}/editor?articleId=${data.articleId}`;
  
  const content = `
    <div style="padding: 30px;">
      <h3 style="color: #d32f2f;">New Review Task Assigned</h3>
      <p>Dear ${data.editorName},</p>
      <p>A new article has been assigned to you for review.</p>
      
      <div style="background-color: #f5f5f5; border-left: 4px solid #d32f2f; padding: 15px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Article Title:</strong> ${data.articleTitle}</p>
        <p style="margin: 5px 0;"><strong>Author:</strong> ${data.authorName}</p>
        <p style="margin: 5px 0;"><strong>Category:</strong> ${data.category}</p>
        <p style="margin: 5px 0;"><strong>Article ID:</strong> ${data.articleId}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${reviewUrl}" 
           style="background-color: #d32f2f; 
                  color: #ffffff; 
                  padding: 15px 40px; 
                  text-decoration: none; 
                  border-radius: 6px; 
                  font-weight: bold; 
                  font-size: 16px; 
                  display: inline-block; 
                  box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          REVIEW ARTICLE NOW
        </a>
      </div>
      
      <p style="font-size: 13px; color: #777; margin-top: 20px;">
        Click the button above to access your dashboard and review this article. If you're already logged in, you'll be taken directly to the article.
      </p>
      
      <p style="font-size: 11px; color: #999; margin-top: 15px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <span style="word-break: break-all; color: #d32f2f;">${reviewUrl}</span>
      </p>
      
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
      <div style="font-size: 13px; color: #777;">
        <p style="margin: 0;">Regards,</p>
        <p style="margin: 5px 0; font-weight: bold; color: #d32f2f;">Executive Team, Law Nation</p>
      </div>
    </div>
  `;

  return {
    subject: "New Review Task Assigned - Law Nation",
    html: wrapInSimpleRedLayout(content)
  };
}