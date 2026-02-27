// src/adapters/email/implementations/nodemailer.email.adapter.ts

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { IEmailAdapter, EmailData, EmailResponse } from "../interfaces/email-adapter.interface.js";

/**
 * Nodemailer Email Adapter (Optimized for AWS SES)
 * Implements email sending using Nodemailer with AWS SES SMTP
 */
export class NodemailerEmailAdapter implements IEmailAdapter {
  private transporter: Transporter;
  private defaultFrom: string;
  private isAwsSes: boolean;

  constructor(config: {
    host: string;
    port: number;
    secure?: boolean;
    auth: {
      user: string;
      pass: string;
    };
    defaultFrom: string;
  }) {
    if (!config.host || !config.auth.user || !config.auth.pass) {
      throw new Error("SMTP configuration is incomplete");
    }

    this.defaultFrom = config.defaultFrom;
    this.isAwsSes = config.host.includes("amazonaws.com");

    // AWS SES optimized configuration
    const transportConfig: any = {
      host: config.host,
      port: config.port,
      secure: config.secure ?? false, // false for port 587 (TLS), true for 465 (SSL)
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
    };

    // AWS SES specific optimizations
    if (this.isAwsSes) {
      transportConfig.pool = true; // Use connection pooling
      transportConfig.maxConnections = 10; // AWS SES allows up to 10 concurrent connections
      transportConfig.maxMessages = 50; // Messages per connection
      transportConfig.rateDelta = 1000; // 1 second
      transportConfig.rateLimit = 14; // AWS SES allows 14 emails/second in production

      // AWS SES requires TLS
      transportConfig.requireTLS = true;
      transportConfig.tls = {
        // Do not fail on invalid certs in dev, but keep it strict for SES
        rejectUnauthorized: true,
      };

      console.log(`✅ [Nodemailer] AWS SES optimized configuration enabled`);
    } else {
      // Generic SMTP configuration
      transportConfig.pool = true;
      transportConfig.maxConnections = 5;
      transportConfig.maxMessages = 100;
      transportConfig.rateDelta = 1000;
      transportConfig.rateLimit = 5;
    }

    this.transporter = nodemailer.createTransport(transportConfig);

    console.log(`✅ [Nodemailer] Transporter created for ${config.host}:${config.port}`);
    console.log(`📧 [Nodemailer] Provider: ${this.isAwsSes ? 'AWS SES' : 'Generic SMTP'}`);
  }

  /**
   * Send a single email via Nodemailer
   */
  async send(emailData: EmailData): Promise<EmailResponse> {
    try {
      console.log(`📧 [Nodemailer] Sending email to: ${emailData.to}`);
      console.log(`📧 [Nodemailer] Subject: ${emailData.subject}`);

      // Convert to Nodemailer format
      const mailOptions = {
        from: emailData.from || this.defaultFrom,
        to: Array.isArray(emailData.to) ? emailData.to.join(", ") : emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        ...(emailData.text && { text: emailData.text }),
        ...(emailData.replyTo && { replyTo: emailData.replyTo }),
        ...(emailData.cc && {
          cc: Array.isArray(emailData.cc) ? emailData.cc.join(", ") : emailData.cc
        }),
        ...(emailData.bcc && {
          bcc: Array.isArray(emailData.bcc) ? emailData.bcc.join(", ") : emailData.bcc
        }),
      };

      // AWS SES specific headers (optional but recommended)
      if (this.isAwsSes) {
        (mailOptions as any).headers = {
          'X-SES-CONFIGURATION-SET': process.env.SES_CONFIGURATION_SET || undefined,
          'X-SES-MESSAGE-TAGS': 'app=law-nation',
        };
      }

      const info = await this.transporter.sendMail(mailOptions);

      console.log(`✅ [Nodemailer] Email sent successfully`);
      console.log(`📧 [Nodemailer] Message ID: ${info.messageId}`);

      if (this.isAwsSes && info.envelope) {
        console.log(`📧 [AWS SES] Envelope: ${JSON.stringify(info.envelope)}`);
      }

      return {
        success: true,
        messageId: info.messageId,
        provider: this.isAwsSes ? "AWS SES" : "Generic SMTP",
      };
    } catch (error: any) {
      console.error(`❌ [Nodemailer] Failed to send email:`, error.message);
      return {
        success: false,
        provider: this.isAwsSes ? "AWS SES" : "Generic SMTP",
        error: error.message,
      };
    }
  }

  /**
   * Send multiple emails (bulk send)
   */
  async sendBulk(emailsData: EmailData[]): Promise<EmailResponse[]> {
    console.log(`📧 [Nodemailer] Processing bulk send: ${emailsData.length} emails`);

    // For simple implementation, we send sequentially or in small batches
    // Nodemailer with pool: true handles connection reuse efficiently
    const results: EmailResponse[] = [];

    for (const email of emailsData) {
      results.push(await this.send(email));
    }

    return results;
  }

  /**
   * Verify connection to email provider
   */
  async verifyConnection(): Promise<boolean> {
    try {
      console.log(`📧 [Nodemailer] Verifying SMTP connection...`);
      await this.transporter.verify();
      console.log(`✅ [Nodemailer] SMTP connection verified`);
      return true;
    } catch (error: any) {
      console.error(`❌ [Nodemailer] SMTP connection verification failed:`, error.message);
      return false;
    }
  }

  /**
   * Get the name of the email provider
   */
  getProviderName(): string {
    return this.isAwsSes ? "AWS SES" : "SMTP";
  }
}