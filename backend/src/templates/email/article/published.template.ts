import { wrapInSimpleRedLayout } from '../shared/layout.template.js';

export function generateArticlePublishedHtml(data: {
  authorName: string;
  articleTitle: string;
  articleId: string;
  diffSummary?: string;
}): { subject: string; html: string } {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const articleUrl = `${frontendUrl}/articles/${data.articleId}`;
  const changeHistoryUrl = `${frontendUrl}/articles/${data.articleId}/change-history`;

  // Build diff summary section if changes were made
  const diffSection = data.diffSummary && data.diffSummary !== "No changes made" ? `
    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; font-weight: bold; color: #856404;">📝 Changes Made During Review</p>
      <p style="margin: 0 0 10px 0; color: #856404; font-size: 14px;">
        Our editorial team made the following changes to improve your article:
      </p>
      <p style="margin: 0; font-weight: bold; color: #856404; font-size: 15px;">
        ${data.diffSummary}
      </p>
      <p style="margin: 10px 0 0 0; font-size: 13px; color: #856404;">
        Click "View What Changed" below to see detailed differences.
      </p>
    </div>
  ` : '';

  const content = `
    <div style="padding: 30px;">
      <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
        <h2 style="margin: 0; color: #155724; font-size: 24px;">🎉 Great News!</h2>
        <p style="margin: 10px 0 0 0; color: #155724; font-size: 16px;">
          Your article <strong>"${data.articleTitle}"</strong> has been published.
        </p>
      </div>

      <p>Dear ${data.authorName},</p>
      
      <p>Thank you for your valuable contribution to Law Nation. Your article is now live and accessible to our readers.</p>
      
      ${diffSection}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${articleUrl}" 
           style="display: inline-block; 
                  padding: 12px 30px; 
                  background-color: #27ae60; 
                  color: white; 
                  text-decoration: none; 
                  border-radius: 5px; 
                  margin: 10px 5px;
                  font-weight: bold;">
          Read Your Published Article
        </a>
        <a href="${changeHistoryUrl}" 
           style="display: inline-block; 
                  padding: 12px 30px; 
                  background-color: #3498db; 
                  color: white; 
                  text-decoration: none; 
                  border-radius: 5px; 
                  margin: 10px 5px;
                  font-weight: bold;">
          View What Changed
        </a>
      </div>
      
      <p style="color: #7f8c8d; font-size: 14px; margin-top: 20px;">
        <strong>Share your article:</strong> You can now share your published article with colleagues and on social media.
      </p>

      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
      <div style="font-size: 13px; color: #777;">
        <p style="margin: 0;">Thank you for contributing to Law Nation</p>
        <p style="margin: 5px 0; font-weight: bold; color: #d32f2f;">Executive Team, Law Nation</p>
      </div>
    </div>
  `;

  return {
    subject: `Your Article Has Been Published - ${data.articleTitle}`,
    html: wrapInSimpleRedLayout(content, `Law Nation © ${new Date().getFullYear()} | Thank you for your contribution`)
  };
}
