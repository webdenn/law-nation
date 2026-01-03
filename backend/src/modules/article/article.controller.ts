import type { Response } from "express";
import type { AuthRequest } from "@/types/auth-request.js";
import { articleService } from "./article.service.js";
import { BadRequestError } from "@/utils/http-errors.util.js";
import { addWatermarkToPdf } from "@/utils/pdf-watermark.utils.js";
import { addSimpleWatermarkToWord } from "@/utils/word-watermark.utils.js";
import {
  articleSubmissionSchema,
  assignEditorSchema,
  uploadCorrectedPdfSchema,
} from "./validators/article.validator.js";
import type {
  ArticleSubmissionData,
  ArticleListFilters,
  AssignEditorData,
  UploadCorrectedPdfData,
} from "./types/article-submission.type.js";

export class ArticleController {
  // Article submission (works for both guest and logged-in users)
  async submitArticle(req: AuthRequest, res: Response) {
    try {
      if (!req.fileMeta?.url) {
        throw new BadRequestError("PDF file is required");
      }

      // Validate request body
      const validatedData = articleSubmissionSchema.parse(req.body);

      const data: ArticleSubmissionData = {
        ...validatedData,
        pdfUrl: req.fileMeta.url,
        // Include image URLs if they were uploaded via uploadArticleFiles middleware
        thumbnailUrl: req.body.thumbnailUrl || undefined,
        imageUrls: req.body.imageUrls || undefined,
      };

      // Pass user ID if logged in (null for guests)
      const userId = req.user?.id;
      const result = await articleService.submitArticle(data, userId);

      // Different response based on whether verification is required
      // Use property checking to narrow the type
      if ('expiresAt' in result) {
        // Guest user - verification email sent
        res.status(200).json({
          message: result.message,
          expiresAt: result.expiresAt,
          requiresVerification: true,
        });
      } else {
        // Logged-in user - article created directly
        res.status(201).json({
          message: result.message,
          article: result.article,
          requiresVerification: false,
        });
      }
    } catch (error) {
      throw error;
    }
  }

  // Verify email and create article (public endpoint)
  async verifyArticleSubmission(req: AuthRequest, res: Response) {
    try {
      const { token } = req.params;

      if (!token) {
        throw new BadRequestError("Verification token is required");
      }

      // Verify token and create article in database
      await articleService.confirmArticleSubmission(token);

      // Frontend home URL - use environment variable for production
      const frontendHomeUrl = process.env.FRONTEND_URL || "http://localhost:3000";

      // Redirect user to home page with success message
      return res.redirect(`${frontendHomeUrl}/law/home?verified=true`);
    } catch (error) {
      console.error("Verification Error:", error);
      const frontendHomeUrl = process.env.FRONTEND_URL || "http://localhost:3000";

      // On error, redirect to home with error message
      return res.redirect(`${frontendHomeUrl}/law/home?error=verification-failed`);
    }
  }

  // Verify article by code (public endpoint - JSON response)
  async verifyArticleByCode(req: AuthRequest, res: Response) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        throw new BadRequestError("Email and verification code are required");
      }

      // Validate code format (6 digits)
      if (!/^\d{6}$/.test(code)) {
        throw new BadRequestError("Verification code must be 6 digits");
      }

      // Verify code and create article
      const result = await articleService.verifyArticleByCode(email, code);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Code Verification Error:", error);
      throw error;
    }
  }

  // Resend verification code (public endpoint)
  async resendVerificationCode(req: AuthRequest, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new BadRequestError("Email is required");
      }

      const result = await articleService.resendVerificationCode(email);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Resend Code Error:", error);
      throw error;
    }
  }

  // Admin assigns editor
  async assignEditor(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }

      // Validate request body
      const validatedData = assignEditorSchema.parse(req.body);
      const data: AssignEditorData = validatedData;
      const adminId = req.user!.id;

      const article = await articleService.assignEditor(articleId, data, adminId);

      res.json({
        message: "Editor assigned successfully",
        article,
      });
    } catch (error) {
      throw error;
    }
  }

  // Editor or Admin approves article (Option A)
  async approveArticle(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }

      const userId = req.user!.id;
      const userRoles = req.user!.roles?.map((role: { name: string }) => role.name) || [];

      const article = await articleService.approveArticle(articleId, userId, userRoles);

      res.json({
        message: "Article approved successfully",
        article,
      });
    } catch (error) {
      throw error;
    }
  }

  // SPECIAL FUNCTION: Sirf Published articles laane ke liye (Homepage ke liye)
  async getPublishedArticles(req: AuthRequest, res: Response) {
    try {
      // Hum yahan zabardasti 'status' ko PUBLISHED set kar rahe hain
      // Taaki Pending articles galti se bhi na aayein
      const filters: ArticleListFilters = {
        ...req.query,       // Baaki filters (page, limit) user se lo
        status: "PUBLISHED" // Lekin status hum fix kar denge
      };

      const result = await articleService.listArticles(filters);

      res.json(result);
    } catch (error) {
      throw error;
    }
  }

  // Editor uploads corrected PDF (Option C - Step 1)
  async uploadCorrectedPdf(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }

      const editorId = req.user!.id;

      if (!req.fileMeta?.url) {
        throw new BadRequestError("PDF file is required");
      }

      // Validate request body
      const validatedData = uploadCorrectedPdfSchema.parse(req.body);

      const data: UploadCorrectedPdfData = {
        pdfUrl: req.fileMeta.url,
        comments: validatedData.comments,
        editorDocumentUrl: req.body.editorDocumentUrl,      // ✅ Pass editor document URL from middleware
        editorDocumentType: req.body.editorDocumentType,    // ✅ Pass editor document type from middleware
      };

      const article = await articleService.uploadCorrectedPdf(articleId, editorId, data);

      res.json({
        message: "Corrected PDF uploaded successfully. Article pending approval.",
        article,
      });
    } catch (error) {
      throw error;
    }
  }

  // List articles with filters
  async listArticles(req: AuthRequest, res: Response) {
    try {
      const filters: ArticleListFilters = req.query;
      const result = await articleService.listArticles(filters);

      res.json(result);
    } catch (error) {
      throw error;
    }
  }

  // Get article preview (public - no auth required)
  async getArticlePreview(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }

      const article = await articleService.getArticlePreview(articleId);

      res.json({ 
        article,
        message: "Login to read full article and download PDF" 
      });
    } catch (error) {
      throw error;
    }
  }

  // Get full article details (protected - auth required)
  async getArticleById(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }

      const article = await articleService.getArticleById(articleId);

      res.json({ article });
    } catch (error) {
      throw error;
    }
  }

  // Get article by slug (SEO-friendly URL)
  async getArticleBySlug(req: AuthRequest, res: Response) {
    try {
      const slug = req.params.slug;
      if (!slug) {
        throw new BadRequestError("Article slug is required");
      }

      const article = await articleService.getArticleBySlug(slug);

      res.json({ article });
    } catch (error) {
      throw error;
    }
  }

  // Get article content by slug (with 250-word limit for guests)
  async getArticleContentBySlug(req: AuthRequest, res: Response) {
    try {
      const slug = req.params.slug;
      if (!slug) {
        throw new BadRequestError("Article slug is required");
      }

      // First get article by slug
      const article = await articleService.getArticleBySlug(slug);

      // Then get content with auth check
      const isAuthenticated = !!req.user;
      const content = await articleService.getArticleContent(article.id, isAuthenticated);

      res.json({
        message: isAuthenticated 
          ? "Article content retrieved successfully"
          : "Preview mode: Login to read the full article",
        article: content,
        requiresLogin: !isAuthenticated && content.isLimited
      });
    } catch (error) {
      throw error;
    }
  }

  // Download article PDF (protected - auth required)
  async downloadArticlePdf(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }

      const userName = req.user?.name || 'Guest User';
      
      console.log(`📥 [Download] User "${userName}" requesting PDF for article ${articleId}`);

      // Get article PDF info
      const article = await articleService.getArticlePdfUrl(articleId);
      
      console.log(`📄 [Download] Article: "${article.title}"`);
      console.log(`📂 [Download] PDF path: ${article.currentPdfUrl}`);

      // Add watermark to PDF with clickable link
      const watermarkedPdf = await addWatermarkToPdf(
        article.currentPdfUrl,
        {
          userName,
          downloadDate: new Date(),
          articleTitle: article.title,
          articleId: articleId,
          frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        }
      );

      // Send watermarked PDF
      const filename = `${article.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', watermarkedPdf.length.toString());
      
      console.log(`✅ [Download] Sending watermarked PDF (${watermarkedPdf.length} bytes)`);
      
      res.send(watermarkedPdf);
    } catch (error) {
      console.error('❌ [Download] Failed:', error);
      throw error;
    }
  }

  // Download article Word (protected - auth required, all logged-in users)
  async downloadArticleWord(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }

      const userName = req.user?.name || 'User';
      
      console.log(`📥 [Download] User "${userName}" requesting Word for article ${articleId}`);

      // Get article Word info
      const article = await articleService.getArticleWordUrl(articleId);
      
      console.log(`📄 [Download] Article: "${article.title}"`);
      console.log(`📂 [Download] Word path: ${article.currentWordUrl}`);

      // Add watermark to Word document with clickable link
      const watermarkedWord = await addSimpleWatermarkToWord(
        article.currentWordUrl!,
        {
          userName,
          downloadDate: new Date(),
          articleTitle: article.title,
          articleId: articleId,
          frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        }
      );

      // Send watermarked Word file
      const filename = `${article.title.replace(/[^a-z0-9]/gi, '_')}.docx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', watermarkedWord.length.toString());
      
      console.log(`✅ [Download] Sending watermarked Word file (${watermarkedWord.length} bytes)`);
      
      res.send(watermarkedWord);
    } catch (error) {
      console.error('❌ [Download] Failed:', error);
      throw error;
    }
  }

  // Delete article
  async deleteArticle(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }

      const result = await articleService.deleteArticle(articleId);

      res.json(result);
    } catch (error) {
      throw error;
    }
  }

  // Get article content for reading (public endpoint with optional auth)
  async getArticleContent(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }

      // Check if user is authenticated
      const isAuthenticated = !!req.user;

      const article = await articleService.getArticleContent(articleId, isAuthenticated);

      // Different messages based on auth status
      if (!isAuthenticated && article.isLimited) {
        res.json({
          message: "Preview mode: Login to read the full article and download PDF",
          article,
          requiresLogin: true,
        });
      } else {
        res.json({
          message: "Article content retrieved successfully",
          article,
          requiresLogin: false,
        });
      }
    } catch (error) {
      throw error;
    }
  }

  // Get article upload history (protected endpoint)
  async getArticleHistory(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }

      const result = await articleService.getArticleHistory(articleId);

      res.json({
        message: "Article history retrieved successfully",
        ...result,
      });
    } catch (error) {
      throw error;
    }
  }

  // Search articles (public endpoint with enhanced filters)
  async searchArticles(req: AuthRequest, res: Response) {
    try {
      const { 
        q, 
        category, 
        author, 
        organization, 
        keyword,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder,
        minScore,
        exclude,
        page, 
        limit 
      } = req.query;

      if (!q || typeof q !== "string") {
        throw new BadRequestError("Search query 'q' is required");
      }

      const filters: {
        category?: string;
        author?: string;
        organization?: string;
        keyword?: string;
        dateFrom?: string;
        dateTo?: string;
        sortBy?: 'relevance' | 'date' | 'title' | 'author';
        sortOrder?: 'asc' | 'desc';
        minScore?: number;
        exclude?: string;
        page?: number;
        limit?: number;
      } = {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      };

      // Add optional filters
      if (category && typeof category === "string") {
        filters.category = category;
      }
      if (author && typeof author === "string") {
        filters.author = author;
      }
      if (organization && typeof organization === "string") {
        filters.organization = organization;
      }
      if (keyword && typeof keyword === "string") {
        filters.keyword = keyword;
      }
      if (dateFrom && typeof dateFrom === "string") {
        filters.dateFrom = dateFrom;
      }
      if (dateTo && typeof dateTo === "string") {
        filters.dateTo = dateTo;
      }
      if (sortBy && typeof sortBy === "string") {
        filters.sortBy = sortBy as 'relevance' | 'date' | 'title' | 'author';
      }
      if (sortOrder && typeof sortOrder === "string") {
        filters.sortOrder = sortOrder as 'asc' | 'desc';
      }
      if (minScore && typeof minScore === "string") {
        filters.minScore = parseFloat(minScore);
      }
      if (exclude && typeof exclude === "string") {
        filters.exclude = exclude;
      }

      const result = await articleService.searchArticles(q, filters);

      res.json({
        message: "Search completed successfully",
        ...result,
      });
    } catch (error) {
      throw error;
    }
  }

  // Upload thumbnail for article
  async uploadThumbnail(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }
      
      if (!req.fileMeta?.url) {
        throw new BadRequestError("Image file is required");
      }
      
      const article = await articleService.uploadThumbnail(articleId, req.fileMeta.url);
      
      res.json({
        message: "Thumbnail uploaded successfully",
        article,
      });
    } catch (error) {
      throw error;
    }
  }

  // Upload multiple images for article
  async uploadImages(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }
      
      if (!req.fileUrls || req.fileUrls.length === 0) {
        throw new BadRequestError("Image files are required");
      }
      
      const imageUrls = req.fileUrls.map(f => f.url);
      const article = await articleService.uploadImages(articleId, imageUrls);
      
      res.json({
        message: `${imageUrls.length} images uploaded successfully`,
        article,
      });
    } catch (error) {
      throw error;
    }
  }

  // ✅ NEW: Editor approves article
  async editorApproveArticle(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }

      const editorId = req.user!.id;

      const article = await articleService.editorApproveArticle(articleId, editorId);

      res.json({
        message: "Article approved successfully. Admin has been notified and can now publish it.",
        article,
      });
    } catch (error) {
      throw error;
    }
  }

  // ✅ NEW: Admin publishes article (only after editor approval)
  async adminPublishArticle(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }

      const adminId = req.user!.id;

      const result = await articleService.adminPublishArticle(articleId, adminId);

      res.json({
        message: "Article published successfully",
        article: result.article,
        diffSummary: result.diffSummary,
      });
    } catch (error) {
      throw error;
    }
  }

  // ✅ NEW: Get article change history
  async getArticleChangeHistory(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }

      const userId = req.user!.id;
      const userRoles = req.user!.roles?.map((role: { name: string }) => role.name) || [];

      const result = await articleService.getArticleChangeHistory(articleId, userId, userRoles);

      res.json({
        message: "Change history retrieved successfully",
        ...result,
      });
    } catch (error) {
      throw error;
    }
  }

  // ✅ NEW: Get specific change log diff
  async getChangeLogDiff(req: AuthRequest, res: Response) {
    try {
      const changeLogId = req.params.changeLogId;
      if (!changeLogId) {
        throw new BadRequestError("Change log ID is required");
      }

      const userId = req.user!.id;
      const userRoles = req.user!.roles?.map((role: { name: string }) => role.name) || [];

      const result = await articleService.getChangeLogDiff(changeLogId, userId, userRoles);

      res.json({
        message: "Change log diff retrieved successfully",
        changeLog: result,
      });
    } catch (error) {
      throw error;
    }
  }

  // Download diff as PDF or Word
  async downloadDiff(req: AuthRequest, res: Response) {
    try {
      const { changeLogId } = req.params;
      const { format } = req.query;
      
      if (!changeLogId) {
        throw new BadRequestError("Change log ID is required");
      }

      // Validate format
      const downloadFormat = format === 'word' ? 'word' : 'pdf';
      
      const userId = req.user!.id;
      const userRoles = req.user!.roles?.map((role: { name: string }) => role.name) || [];

      const result = await articleService.downloadDiff(changeLogId, userId, userRoles, downloadFormat);

      // Set headers for file download
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', result.buffer.length);

      // Send file buffer
      res.send(result.buffer);
    } catch (error) {
      throw error;
    }
  }

  // ✅ NEW: Download editor's uploaded document
  async downloadEditorDocument(req: AuthRequest, res: Response) {
    try {
      const { changeLogId } = req.params;
      const { format } = req.query;
      
      if (!changeLogId) {
        throw new BadRequestError("Change log ID is required");
      }

      // Validate format
      const downloadFormat = format === 'word' ? 'word' : 'pdf';
      
      const userId = req.user!.id;
      const userRoles = req.user!.roles?.map((role: { name: string }) => role.name) || [];

      const result = await articleService.downloadEditorDocument(changeLogId, userId, userRoles, downloadFormat);

      // Read file from disk
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const fullPath = path.join(process.cwd(), result.filePath);
      const fileBuffer = await fs.readFile(fullPath);

      // Set headers for file download
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', fileBuffer.length);

      console.log(`✅ [Editor Doc Download] Sending file: ${result.filename} (${fileBuffer.length} bytes)`);

      // Send file buffer
      res.send(fileBuffer);
    } catch (error) {
      console.error('❌ [Editor Doc Download] Failed:', error);
      throw error;
    }
  }
}

export const articleController = new ArticleController();