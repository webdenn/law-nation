// src/adapters/email/email.adapter.factory.ts

import type { IEmailAdapter } from "./interfaces/email-adapter.interface.js";
import { ResendEmailAdapter } from "./implementations/resend.email.adapter.js";

/**
 * Email Adapter Factory
 * Creates and returns the Resend email adapter
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
   * Create Resend email adapter
   */
  private static createAdapter(): IEmailAdapter {
    const apiKey = process.env.RESEND_API_KEY;
    const defaultFrom = process.env.SMTP_FROM || "Law Nation <onboarding@resend.dev>";

    if (!apiKey) {
      throw new Error("RESEND_API_KEY is required in environment variables");
    }

    console.log(`✅ [Factory] Resend adapter created with from: ${defaultFrom}`);
    return new ResendEmailAdapter(apiKey, defaultFrom);
  }

  /**
   * Reset adapter instance (useful for testing)
   */
  static resetAdapter(): void {
    this.instance = null;
  }
}
