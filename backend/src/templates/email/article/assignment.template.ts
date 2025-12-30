export function generateAuthorAssignmentHtml(data: {
  authorName: string;
  articleTitle: string;
  articleId: string;
}): { subject: string; html: string } {
  const content = `
    <div style="font-family: 'Georgia', serif; max-width: 600px; margin: auto; border: 1px solid #d4af37; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #1a1a1a; padding: 20px; text-align: center;">
        <h1 style="color: #d4af37; margin: 0; font-size: 22px;">LAW NATION</h1>
      </div>
      <div style="padding: 30px; text-align: center;">
        <h2 style="color: #1a1a1a;">Editor Assigned</h2>
        <p style="font-size: 16px;">Dear ${data.authorName},</p>
        <p style="font-size: 16px;">Your article <b>"${data.articleTitle}"</b> has been successfully assigned to an editor for formal review.</p>
        <p style="color: #555;">You will be notified once the review process is complete.</p>
      </div>
    </div>
  `;

  return {
    subject: "Status Update: Editor Assigned - Law Nation",
    html: content
  };
}
