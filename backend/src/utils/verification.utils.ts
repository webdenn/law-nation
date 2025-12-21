import crypto from 'crypto';
import { prisma } from '@/db/db.js';
import fs from 'fs/promises';
import path from 'path';

// Default TTL: 48 hours
const DEFAULT_TTL_HOURS = parseInt(process.env.VERIFICATION_TTL_HOURS || '48');

export class VerificationService {
  
  /**
   * Generate a secure verification token
   */
  static generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a verification record with 48-hour TTL
   */
  static async createVerificationRecord(
    email: string,
    resourceType: string,
    metadata: any,
    ttlHours: number = DEFAULT_TTL_HOURS
  ) {
    const token = this.generateVerificationToken();
    const resourceId = crypto.randomUUID();
    
    // Calculate expiration: current time + 48 hours
    const ttl = new Date();
    ttl.setHours(ttl.getHours() + ttlHours);

    const verification = await prisma.emailVerification.create({
      data: {
        resourceId,
        resourceType,
        email,
        token,
        ttl,
        metadata,
      },
    });

    return { token, verificationId: verification.id, expiresAt: ttl };
  }

  /**
   * Verify token and check if it's within 48-hour window
   */
  static async verifyToken(token: string) {
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
    });

    if (!verification) {
      return { valid: false, error: 'Invalid verification token' };
    }

    if (verification.isVerified) {
      return { valid: false, error: 'Token already used' };
    }

    // Check if token expired (after 48 hours)
    if (new Date() > verification.ttl) {
      return { valid: false, error: 'Verification link expired (48 hours passed)' };
    }

    return { valid: true, data: verification.metadata, verification };
  }

  /**
   * Mark verification as complete
   */
  static async markAsVerified(token: string) {
    await prisma.emailVerification.update({
      where: { token },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
    return true;
  }

  /**
   * Delete verification record
   */
  static async deleteVerification(token: string) {
    await prisma.emailVerification.delete({
      where: { token },
    });
  }

  /**
   * Cleanup expired verifications (older than 48 hours)
   * This runs every hour but only deletes records past their TTL
   */
  static async cleanupExpiredVerifications() {
    const now = new Date();
    
    // Find all unverified records where TTL has passed
    const expiredRecords = await prisma.emailVerification.findMany({
      where: {
        isVerified: false,
        ttl: { lt: now }, // TTL less than current time (expired)
      },
    });

    let deletedCount = 0;
    let filesDeleted = 0;

    for (const record of expiredRecords) {
      try {
        // Delete temporary file if it exists
        if (record.resourceType === 'ARTICLE' && record.metadata) {
          const metadata = record.metadata as any;
          if (metadata.tempPdfPath) {
            await this.deleteTempFile(metadata.tempPdfPath);
            filesDeleted++;
          }
        }

        // Delete verification record
        await prisma.emailVerification.delete({
          where: { id: record.id },
        });
        
        deletedCount++;
      } catch (error) {
        console.error(`Failed to cleanup verification ${record.id}:`, error);
      }
    }

    return { deletedCount, filesDeleted };
  }

  /**
   * Delete temporary file
   */
  private static async deleteTempFile(filePath: string) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      await fs.unlink(fullPath);
      console.log(`Deleted temp file: ${filePath}`);
    } catch (error) {
      console.error(`Failed to delete temp file ${filePath}:`, error);
    }
  }

  /**
   * Move file from temp to permanent directory
   */
  static async moveTempFile(tempPath: string): Promise<string> {
    const filename = path.basename(tempPath);
    const permanentPath = `uploads/pdfs/${filename}`;
    const tempFullPath = path.join(process.cwd(), tempPath);
    const permanentFullPath = path.join(process.cwd(), permanentPath);

    try {
      await fs.rename(tempFullPath, permanentFullPath);
      console.log(`Moved file from ${tempPath} to ${permanentPath}`);
      return permanentPath;
    } catch (error) {
      console.error(`Failed to move file from ${tempPath} to ${permanentPath}:`, error);
      throw error;
    }
  }
}
