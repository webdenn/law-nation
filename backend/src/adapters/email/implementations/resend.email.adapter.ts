// src/adapters/email/implementations/resend.email.adapter.ts

import { Resend } from "resend";
import type { IEmailAdapter, EmailData, EmailResponse } from "../interfaces/email-adapter.interface.js";

/**
 * Resend Email Adapter
 * Implements email sending using Resend service
 */
export class ResendEmailAdapter implements IEmailAdapter {
  private resend: Resend;
  private defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string) {
    if (!apiKey) {
      throw new Error("Resend API key is required");
    }
    this.resend = new Resend(apiKey);
    this.defaultFrom = defaultFrom;
  }

  /**
   * Send a single email via Resend
   */
  async send(emailData: EmailData): Promise<EmailResponse> {
    try {
      console.log(`📧 [Resend] Sending email to: ${emailData.to}`);
      console.log(`📧 [Resend] Subject: ${emailData.subject}`);

      // Convert to Resend format
      const resendData = {
        from: emailData.from || this.defaultFrom,
        to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
        subject: emailData.subject,
        html: emailData.html,
        ...(emailData.text && { text: emailData.text }),
        ...(emailData.replyTo && { reply_to: emailData.replyTo }),
        ...(emailData.cc && { cc: Array.isArray(emailData.cc) ? emailData.cc : [emailData.cc] }),
        ...(emailData.bcc && { bcc: Array.isArray(emailData.bcc) ? emailData.bcc : [emailData.bcc] }),
      };

      const { data, error } = await this.resend.emails.send(resendData);

      if (error) {
        console.error("❌ [Resend] API error:", {
          message: error.message,
          name: error.name,
          statusCode: (error as any).statusCode,
        });

        return {
          success: false,
          provider: "resend",
          error: error.message,
        };
      }

      console.log(`✅ [Resend] Email sent successfully`);
      console.log(`📧 [Resend] Message ID: ${data?.id}`);

      return {
        success: true,
        messageId: data?.id,
        provider: "resend",
      };
    } catch (error) {
      console.error("❌ [Resend] Unexpected error:", error);
      
      return {
        success: false,
        provider: "resend",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send multiple emails via Resend
   */
  async sendBulk(emailsData: EmailData[]): Promise<EmailResponse[]> {
    console.log(`📧 [Resend] Sending ${emailsData.length} emails in bulk`);
    
    // Resend doesn't have a native bulk send API, so we send sequentially
    const results: EmailResponse[] = [];
    
    for (const emailData of emailsData) {
      const result = await this.send(emailData);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Verify connection to Resend
   */
  async verifyConnection(): Promise<boolean> {
    try {
      // Resend doesn't have a ping/health endpoint
      // We'll just check if the API key is set
      return !!this.resend;
    } catch (error) {
      console.error("❌ [Resend] Connection verification failed:", error);
      return false;
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return "resend";
  }
}
