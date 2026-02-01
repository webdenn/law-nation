import type { IEmailAdapter } from "./interfaces/email-adapter.interface.js";
/**
 * Email Adapter Factory
 * Creates and returns the Resend email adapter
 */
export declare class EmailAdapterFactory {
    private static instance;
    /**
     * Get email adapter instance (singleton)
     */
    static getAdapter(): IEmailAdapter;
    /**
     * Create Resend email adapter
     */
    private static createAdapter;
    /**
     * Reset adapter instance (useful for testing)
     */
    static resetAdapter(): void;
}
//# sourceMappingURL=email.adapter.factory.d.ts.map