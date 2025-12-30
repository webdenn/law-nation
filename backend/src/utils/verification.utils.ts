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
   * Generate a 6-digit verification code
   */
  static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create a verification record with 48-hour TTL and optional code
   */
  static async createVerificationRecord(
    email: string,
    resourceType: string,
    metadata: any,
    ttlHours: number = DEFAULT_TTL_HOURS,
    includeCode: boolean = false
  ) {
    const token = this.generateVerificationToken();
    const resourceId = crypto.randomUUID();
    const verificationCode = includeCode ? this.generateVerificationCode() : null;
    
    // Calculate expiration: current time + 48 hours
    const ttl = new Date();
    ttl.setHours(ttl.getHours() + ttlHours);

    const verification = await prisma.emailVerification.create({
      data: {
        resourceId,
        resourceType,
        email,
        token,
        verificationCode,
        ttl,
        metadata,
      },
    });

    return { 
      token, 
      code: verificationCode, 
      verificationId: verification.id, 
      expiresAt: ttl 
    };
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
   * Verify code and check if it's valid
   */
  static async verifyCode(email: string, code: string) {
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        verificationCode: code,
        isVerified: false,
      },
    });

    if (!verification) {
      return { valid: false, error: 'Invalid verification code' };
    }

    // Check if code expired (after 48 hours)
    if (new Date() > verification.ttl) {
      return { valid: false, error: 'Verification code expired (48 hours passed)' };
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
   * Mark verification as complete by email and code
   */
  static async markAsVerifiedByCode(email: string, code: string) {
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        verificationCode: code,
      },
    });

    if (!verification) {
      throw new Error('Verification not found');
    }

    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
    return verification.token;
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
   * Delete verification record by email and code
   */
  static async deleteVerificationByCode(email: string, code: string) {
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        verificationCode: code,
      },
    });

    if (verification) {
      await prisma.emailVerification.delete({
        where: { id: verification.id },
      });
    }
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
        // Delete temporary files if they exist
        if (record.resourceType === 'ARTICLE' && record.metadata) {
          const metadata = record.metadata as any;
          
          // Delete temp PDF
          if (metadata.tempPdfPath) {
            await this.deleteTempFile(metadata.tempPdfPath);
            filesDeleted++;
          }
          
          // ✅ NEW: Delete temp Word file
          if (metadata.tempWordPath) {
            await this.deleteTempFile(metadata.tempWordPath);
            filesDeleted++;
          }
          
          // ✅ Delete temp thumbnail
          if (metadata.thumbnailUrl && metadata.thumbnailUrl.includes('/temp/')) {
            await this.deleteTempFile(metadata.thumbnailUrl);
            filesDeleted++;
          }
          
          // ✅ Delete temp images
          if (metadata.imageUrls && Array.isArray(metadata.imageUrls)) {
            for (const imageUrl of metadata.imageUrls) {
              if (imageUrl.includes('/temp/')) {
                await this.deleteTempFile(imageUrl);
                filesDeleted++;
              }
            }
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
      
      // Check if file exists before trying to delete
      try {
        await fs.access(fullPath);
      } catch {
        // File doesn't exist, skip deletion
        console.log(`⚠️  Temp file already deleted: ${filePath}`);
        return;
      }
      
      await fs.unlink(fullPath);
      console.log(`🗑️  Deleted temp file: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to delete temp file ${filePath}:`, error);
    }
  }

  /**
   * Move file from temp to permanent directory
   */
  static async moveTempFile(tempPath: string): Promise<string> {
    const filename = path.basename(tempPath);
    
    // Determine if it's a PDF or image based on path
    const isPdf = tempPath.includes('/pdfs/') || tempPath.includes('uploads/temp/') && !tempPath.includes('/images/');
    const permanentDir = isPdf ? 'uploads/pdfs/' : 'uploads/images/';
    const permanentPath = `${permanentDir}${filename}`;
    
    const tempFullPath = path.join(process.cwd(), tempPath);
    const permanentFullPath = path.join(process.cwd(), permanentPath);

    try {
      // Ensure permanent directory exists
      const permanentDirPath = path.join(process.cwd(), permanentDir);
      await fs.mkdir(permanentDirPath, { recursive: true });
      
      await fs.rename(tempFullPath, permanentFullPath);
      console.log(`Moved file from ${tempPath} to ${permanentPath}`);
      return permanentPath;
    } catch (error) {
      console.error(`Failed to move file from ${tempPath} to ${permanentPath}:`, error);
      throw error;
    }
  }
}
