/**
 * Shared email layout wrapper
 * Provides consistent branding across all emails
 */

export function wrapInRedLayout(content: string): string {
  return `
    <div style="font-family: 'Helvetica', Arial, sans-serif; max-width: 600px; margin: auto; border: 2px solid #d32f2f; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      
      <div style="background-color: #d32f2f; padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 32px; letter-spacing: 2px; font-weight: bold; text-transform: uppercase;">LAW NATION</h1>
        <p style="color: #ffcdd2; margin: 5px 0 0 0; font-size: 12px; letter-spacing: 1px;">THE ULTIMATE LEGAL RESEARCH PORTAL</p>
      </div>
      
      ${content}

      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eeeeee;">
        Law Nation &copy; 2025 | New Delhi, India | Legal Scholarship Excellence
      </div>
    </div>
  `;
}

export function wrapInSimpleRedLayout(content: string, footerText?: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #d32f2f; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #d32f2f; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">LAW NATION</h1>
      </div>
      ${content}
      ${footerText ? `
      <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eeeeee;">
        ${footerText}
      </div>
      ` : ''}
    </div>
  `;
}
