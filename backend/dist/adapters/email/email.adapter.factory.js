// src/adapters/email/email.adapter.factory.ts
import { ResendEmailAdapter } from "./implementations/resend.email.adapter.js";
/**
 * Email Adapter Factory
 * Creates and returns the Resend email adapter
 */
export class EmailAdapterFactory {
    static instance = null;
    /**
     * Get email adapter instance (singleton)
     */
    static getAdapter() {
        if (!this.instance) {
            this.instance = this.createAdapter();
        }
        return this.instance;
    }
    /**
     * Create Resend email adapter
     */
    static createAdapter() {
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
    static resetAdapter() {
        this.instance = null;
    }
}
//# sourceMappingURL=email.adapter.factory.js.map