import { wrapInSimpleRedLayout } from '../shared/layout.template.js';

export function generateArticleCorrectionHtml(data: {
  authorName: string;
  articleTitle: string;
  articleId: string;
  editorComments?: string;
}): { subject: string; html: string } {
  const content = `
    <div style="padding: 30px;">
      <h3 style="color: #d32f2f;">Correction Required</h3>
      <p>Dear ${data.authorName},</p>
      <p>Your article <b>"${data.articleTitle}"</b> requires some updates before it can be published.</p>
      <p style="font-size: 14px; color: #666;"><b>Article ID:</b> ${data.articleId}</p>
      
      ${data.editorComments ? `
      <div style="background-color: #fff3cd; border-left: 3px solid #ffc107; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold; color: #856404;">Editor's Comments:</p>
        <p style="margin: 10px 0 0 0; color: #856404;">${data.editorComments}</p>
      </div>
      ` : ''}
      
      <p style="font-size: 13px; color: #777; margin-top: 20px;">
        Please review the feedback and submit a revised version.
      </p>
      <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;">
      <div style="font-size: 13px; color: #777;">
        <p style="margin: 0;">Regards,</p>
        <p style="margin: 5px 0; font-weight: bold; color: #d32f2f;">Executive Team, Law Nation</p>
      </div>
    </div>
  `;

  return {
    subject: "Article Correction Required - Law Nation",
    html: wrapInSimpleRedLayout(content)
  };
}
