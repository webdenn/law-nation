// src/adapters/email/interfaces/email-adapter.interface.ts

/**
 * Standard email data structure used across all adapters
 */
export interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

/**
 * Standard response from email adapters
 */
export interface EmailResponse {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
}

/**
 * Email Adapter Interface
 * All email provider adapters must implement this interface
 */
export interface IEmailAdapter {
  /**
   * Send a single email
   */
  send(emailData: EmailData): Promise<EmailResponse>;

  /**
   * Send multiple emails (bulk send)
   */
  sendBulk(emailsData: EmailData[]): Promise<EmailResponse[]>;

  /**
   * Verify connection to email provider
   */
  verifyConnection(): Promise<boolean>;

  /**
   * Get the name of the email provider
   */
  getProviderName(): string;
}
