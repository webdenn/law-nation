/**
 * Google reCAPTCHA Verification Utility
 */
/**
 * Verify reCAPTCHA token with Google API
 * @param token - reCAPTCHA token from frontend
 * @param remoteIp - User's IP address (optional)
 * @returns Verification result
 */
export declare function verifyRecaptcha(token: string, remoteIp?: string): Promise<{
    success: boolean;
    score?: number;
    error?: string;
}>;
//# sourceMappingURL=recaptcha.utils.d.ts.map