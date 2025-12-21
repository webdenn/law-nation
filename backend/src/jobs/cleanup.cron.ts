import { VerificationService } from '@/utils/verification.utils.js';

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
export function startCleanupCron() {
  // Run every 1 hour (3600000 ms)
  const INTERVAL = parseInt(process.env.CLEANUP_INTERVAL_MS || '3600000');
  
  console.log(`[CRON] ✅ Cleanup job initialized`);
  console.log(`[CRON] 📅 Frequency: Every ${INTERVAL / 1000 / 60} minutes`);
  console.log(`[CRON] ⏰ Verification TTL: ${process.env.VERIFICATION_TTL_HOURS || 48} hours`);
  
  // Run immediately on startup
  runCleanup();
  
  // Then run every hour
  setInterval(async () => {
    await runCleanup();
  }, INTERVAL);
}

async function runCleanup() {
  try {
    const startTime = new Date();
    console.log(`\n[CRON] 🧹 Starting cleanup at ${startTime.toISOString()}`);
    
    const result = await VerificationService.cleanupExpiredVerifications();
    
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    console.log(`[CRON] ✅ Cleanup completed in ${duration}ms`);
    console.log(`[CRON] 🗑️  Deleted ${result.deletedCount} expired verifications`);
    console.log(`[CRON] 📄 Deleted ${result.filesDeleted} temporary files`);
    
    if (result.deletedCount > 0) {
      console.log(`[CRON] ⚠️  ${result.deletedCount} submissions expired without verification`);
    } else {
      console.log(`[CRON] ✨ No expired verifications found`);
    }
  } catch (error) {
    console.error('[CRON] ❌ Cleanup error:', error);
  }
}
