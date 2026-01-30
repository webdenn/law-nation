import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import type {
  AdminPdfUploadRequest,
  AdminPdfUpdateRequest,
  AdminPdfResponse,
  AdminPdfListResponse,
  AdminPdfQueryParams,
  AdminPdfStatsResponse
} from '../types/admin-pdf.type.js';

const prisma = new PrismaClient();

export class AdminPdfService {
  /**
   * Format file size in bytes to human readable format
   */
  private formatFileSize(bytes: bigint): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0n) return '0 Bytes';
    
    const i = Math.floor(Math.log(Number(bytes)) / Math.log(1024));
    const size = Number(bytes) / Math.pow(1024, i);
    
    return `${size.toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Transform database record to response format
   */
  private transformPdfRecord(record: any): AdminPdfResponse {
    return {
      id: record.id,
      title: record.title,
      shortDescription: record.shortDescription,
      issue: record.issue,
      volume: record.volume,
      originalPdfUrl: record.originalPdfUrl,
      watermarkedPdfUrl: record.watermarkedPdfUrl,
      fileSize: this.formatFileSize(record.fileSize),
      uploadedBy: record.uploadedBy,
      uploadedAt: record.uploadedAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      isVisible: record.isVisible,
      uploader: {
        id: record.uploader.id,
        name: record.uploader.name,
        email: record.uploader.email
      }
    };
  }

  /**
   * Create new admin PDF record
   */
  async createAdminPdf(
    data: AdminPdfUploadRequest,
    fileInfo: {
      originalPdfUrl: string;
      watermarkedPdfUrl: string;
      fileSize: number;
    },
    uploadedBy: string
  ): Promise<AdminPdfResponse> {
    try {
      const adminPdf = await prisma.adminPdf.create({
        data: {
          title: data.title,
          shortDescription: data.shortDescription || null,
          issue: data.issue,
          volume: data.volume,
          originalPdfUrl: fileInfo.originalPdfUrl,
          watermarkedPdfUrl: fileInfo.watermarkedPdfUrl,
          fileSize: BigInt(fileInfo.fileSize),
          uploadedBy
        },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return this.transformPdfRecord(adminPdf);
    } catch (error) {
      console.error('❌ [AdminPdfService] Failed to create admin PDF:', error);
      throw new Error('Failed to create admin PDF record');
    }
  }

  /**
   * Get paginated list of admin PDFs
   */
  async getAdminPdfs(params: AdminPdfQueryParams): Promise<AdminPdfListResponse> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        volume,
        issue,
        isVisible,
        sortBy = 'uploadedAt',
        sortOrder = 'desc'
      } = params;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (volume) {
        where.volume = volume;
      }

      if (issue) {
        where.issue = issue;
      }

      if (typeof isVisible === 'boolean') {
        where.isVisible = isVisible;
      }

      // Build order by clause
      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      // Get total count
      const total = await prisma.adminPdf.count({ where });

      // Get paginated results
      const pdfs = await prisma.adminPdf.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      const transformedPdfs = pdfs.map(pdf => this.transformPdfRecord(pdf));

      return {
        pdfs: transformedPdfs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('❌ [AdminPdfService] Failed to get admin PDFs:', error);
      throw new Error('Failed to retrieve admin PDFs');
    }
  }

  /**
   * Get single admin PDF by ID
   */
  async getAdminPdfById(id: string): Promise<AdminPdfResponse | null> {
    try {
      const adminPdf = await prisma.adminPdf.findUnique({
        where: { id },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!adminPdf) {
        return null;
      }

      return this.transformPdfRecord(adminPdf);
    } catch (error) {
      console.error('❌ [AdminPdfService] Failed to get admin PDF by ID:', error);
      throw new Error('Failed to retrieve admin PDF');
    }
  }

  /**
   * Update admin PDF
   */
  async updateAdminPdf(id: string, data: AdminPdfUpdateRequest): Promise<AdminPdfResponse | null> {
    try {
      const adminPdf = await prisma.adminPdf.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return this.transformPdfRecord(adminPdf);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        return null;
      }
      console.error('❌ [AdminPdfService] Failed to update admin PDF:', error);
      throw new Error('Failed to update admin PDF');
    }
  }

  /**
   * Delete admin PDF and associated files
   */
  async deleteAdminPdf(id: string): Promise<boolean> {
    try {
      // Get PDF record first to get file paths
      const adminPdf = await prisma.adminPdf.findUnique({
        where: { id }
      });

      if (!adminPdf) {
        return false;
      }

      // Delete database record
      await prisma.adminPdf.delete({
        where: { id }
      });

      // Delete physical files (if local storage)
      if (process.env.NODE_ENV === 'local') {
        try {
          // Delete original file
          if (adminPdf.originalPdfUrl.startsWith('/uploads/')) {
            const originalPath = path.join(process.cwd(), adminPdf.originalPdfUrl);
            if (fs.existsSync(originalPath)) {
              fs.unlinkSync(originalPath);
              console.log(`🗑️ [AdminPdfService] Deleted original file: ${originalPath}`);
            }
          }

          // Delete watermarked file
          if (adminPdf.watermarkedPdfUrl.startsWith('/uploads/')) {
            const watermarkedPath = path.join(process.cwd(), adminPdf.watermarkedPdfUrl);
            if (fs.existsSync(watermarkedPath)) {
              fs.unlinkSync(watermarkedPath);
              console.log(`🗑️ [AdminPdfService] Deleted watermarked file: ${watermarkedPath}`);
            }
          }
        } catch (fileError) {
          console.warn('⚠️ [AdminPdfService] Failed to delete physical files:', fileError);
          // Continue - database record is already deleted
        }
      }

      return true;
    } catch (error) {
      console.error('❌ [AdminPdfService] Failed to delete admin PDF:', error);
      throw new Error('Failed to delete admin PDF');
    }
  }

  /**
   * Get admin PDF statistics
   */
  async getAdminPdfStats(): Promise<AdminPdfStatsResponse> {
    try {
      // Get basic counts
      const [totalPdfs, visiblePdfs, hiddenPdfs] = await Promise.all([
        prisma.adminPdf.count(),
        prisma.adminPdf.count({ where: { isVisible: true } }),
        prisma.adminPdf.count({ where: { isVisible: false } })
      ]);

      // Get total size
      const sizeResult = await prisma.adminPdf.aggregate({
        _sum: {
          fileSize: true
        }
      });

      const totalSize = this.formatFileSize(sizeResult._sum.fileSize || 0n);

      // Get volume statistics
      const volumeStats = await prisma.adminPdf.groupBy({
        by: ['volume'],
        _count: {
          id: true
        },
        _sum: {
          fileSize: true
        },
        orderBy: {
          volume: 'desc'
        }
      });

      // Get issue statistics
      const issueStats = await prisma.adminPdf.groupBy({
        by: ['issue'],
        _count: {
          id: true
        },
        _sum: {
          fileSize: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      });

      return {
        totalPdfs,
        totalSize,
        visiblePdfs,
        hiddenPdfs,
        volumeStats: volumeStats.map(stat => ({
          volume: stat.volume,
          count: stat._count.id,
          size: this.formatFileSize(stat._sum.fileSize || 0n)
        })),
        issueStats: issueStats.map(stat => ({
          issue: stat.issue,
          count: stat._count.id,
          size: this.formatFileSize(stat._sum.fileSize || 0n)
        }))
      };
    } catch (error) {
      console.error('❌ [AdminPdfService] Failed to get admin PDF stats:', error);
      throw new Error('Failed to retrieve admin PDF statistics');
    }
  }

  /**
   * Check if admin PDF exists
   */
  async adminPdfExists(id: string): Promise<boolean> {
    try {
      const count = await prisma.adminPdf.count({
        where: { id }
      });
      return count > 0;
    } catch (error) {
      console.error('❌ [AdminPdfService] Failed to check admin PDF existence:', error);
      return false;
    }
  }

  /**
   * Get visible admin PDFs for user side
   */
  async getVisibleAdminPdfs(params: AdminPdfQueryParams): Promise<AdminPdfListResponse> {
    const visibleParams = { ...params, isVisible: true };
    return this.getAdminPdfs(visibleParams);
  }
}