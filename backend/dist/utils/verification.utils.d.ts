export declare class VerificationService {
    /**
     * Generate a secure verification token
     */
    static generateVerificationToken(): string;
    /**
     * Generate a 6-digit verification code
     */
    static generateVerificationCode(): string;
    /**
     * Create a verification record with 48-hour TTL and optional code
     */
    static createVerificationRecord(email: string, resourceType: string, metadata: any, ttlHours?: number, includeCode?: boolean): Promise<{
        token: string;
        code: string | null;
        verificationId: string;
        expiresAt: Date;
    }>;
    /**
     * Verify token and check if it's within 48-hour window
     */
    static verifyToken(token: string): Promise<{
        valid: boolean;
        error: string;
        data?: never;
        verification?: never;
    } | {
        valid: boolean;
        data: import("@prisma/client/runtime/client").JsonValue;
        verification: {
            id: string;
            createdAt: Date;
            email: string;
            updatedAt: Date;
            resourceType: string;
            isVerified: boolean;
            resourceId: string;
            token: string;
            verificationCode: string | null;
            verifiedAt: Date | null;
            ttl: Date;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
        };
        error?: never;
    }>;
    /**
     * Verify code and check if it's valid
     */
    static verifyCode(email: string, code: string): Promise<{
        valid: boolean;
        error: string;
        data?: never;
        verification?: never;
    } | {
        valid: boolean;
        data: import("@prisma/client/runtime/client").JsonValue;
        verification: {
            id: string;
            createdAt: Date;
            email: string;
            updatedAt: Date;
            resourceType: string;
            isVerified: boolean;
            resourceId: string;
            token: string;
            verificationCode: string | null;
            verifiedAt: Date | null;
            ttl: Date;
            metadata: import("@prisma/client/runtime/client").JsonValue | null;
        };
        error?: never;
    }>;
    /**
     * Mark verification as complete
     */
    static markAsVerified(token: string): Promise<boolean>;
    /**
     * Mark verification as complete by email and code
     */
    static markAsVerifiedByCode(email: string, code: string): Promise<string>;
    /**
     * Delete verification record
     */
    static deleteVerification(token: string): Promise<void>;
    /**
     * Delete verification record by email and code
     */
    static deleteVerificationByCode(email: string, code: string): Promise<void>;
    /**
     * Cleanup expired verifications (older than 48 hours)
     * This runs every hour but only deletes records past their TTL
     */
    static cleanupExpiredVerifications(): Promise<{
        deletedCount: number;
        filesDeleted: number;
    }>;
    /**
     * Delete temporary file
     */
    private static deleteTempFile;
    /**
     * Move file from temp to permanent directory
     */
    static moveTempFile(tempPath: string): Promise<string>;
}
//# sourceMappingURL=verification.utils.d.ts.map