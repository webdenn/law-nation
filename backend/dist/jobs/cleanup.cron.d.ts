/**
 * Cleanup Cron Job
 *
 * Frequency: Runs every 1 hour
 * Purpose: Delete verifications that expired (48 hours after submission)
 *
 * Timeline:
 * - User submits at 10:00 AM Monday
 * - Verification expires at 10:00 AM Wednesday (48 hours later)
 * - Cron runs every hour and will delete it after expiration
 */
export declare function startCleanupCron(): void;
//# sourceMappingURL=cleanup.cron.d.ts.map