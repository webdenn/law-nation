

// src/adapters/email/email.adapter.factory.ts

import type { IEmailAdapter } from "./interfaces/email-adapter.interface.js";
import { NodemailerEmailAdapter } from "./implementations/nodemailer.email.adapter.js";

/**
 * Email Adapter Factory
 * Creates and returns the Nodemailer email adapter (AWS SES optimized)
 */
export class EmailAdapterFactory {
  private static instance: IEmailAdapter | null = null;

  /**
   * Get email adapter instance (singleton)
   */
  static getAdapter(): IEmailAdapter {
    if (!this.instance) {
      this.instance = this.createAdapter();
    }
    return this.instance;
  }

  /**
   * Create Nodemailer email adapter (AWS SES configuration)
   */
  private static createAdapter(): IEmailAdapter {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
    const smtpSecure = process.env.SMTP_SECURE === "true";
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const defaultFrom = process.env.SMTP_FROM || "Law Nation <noreply@law-nation.com>";

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error(
        "SMTP configuration is incomplete. Required: SMTP_HOST, SMTP_USER, SMTP_PASS"
      );
    }

    // Detect if using AWS SES
    const isAwsSes = smtpHost.includes("amazonaws.com");

    console.log(`✅ [Factory] Email adapter initialization`);
    console.log(`📧 [Factory] Provider: ${isAwsSes ? 'AWS SES' : 'Generic SMTP'}`);
    console.log(`📧 [Factory] SMTP Host: ${smtpHost}:${smtpPort}`);
    console.log(`📧 [Factory] SMTP User: ${smtpUser}`);
    console.log(`📧 [Factory] Default From: ${defaultFrom}`);

    if (isAwsSes) {
      const region = smtpHost.split(".")[1]; // Extract region from hostname
      console.log(` [Factory] AWS Region: ${region}`);
      console.log(` [Factory] Ensure your SES account is out of sandbox mode for production`);
    }

    return new NodemailerEmailAdapter({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      defaultFrom,
    });
  }

  /**
   * Reset adapter instance (useful for testing)
   */
  static resetAdapter(): void {
    this.instance = null;
  }
}