import type { IEmailAdapter, EmailData, EmailResponse } from "../interfaces/email-adapter.interface.js";
/**
 * Resend Email Adapter
 * Implements email sending using Resend service
 */
export declare class ResendEmailAdapter implements IEmailAdapter {
    private resend;
    private defaultFrom;
    constructor(apiKey: string, defaultFrom: string);
    /**
     * Send a single email via Resend
     */
    send(emailData: EmailData): Promise<EmailResponse>;
    /**
     * Send multiple emails via Resend
     */
    sendBulk(emailsData: EmailData[]): Promise<EmailResponse[]>;
    /**
     * Verify connection to Resend
     */
    verifyConnection(): Promise<boolean>;
    /**
     * Get provider name
     */
    getProviderName(): string;
}
//# sourceMappingURL=resend.email.adapter.d.ts.map