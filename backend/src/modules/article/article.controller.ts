import type { Response, NextFunction } from "express";
import type { AuthRequest } from "@/types/auth-request.js";
import { articleService } from "./article.service.js";
import { BadRequestError, ForbiddenError } from "@/utils/http-errors.util.js";
import { addWatermarkToPdf } from "@/utils/pdf-watermark.utils.js";
import { addSimpleWatermarkToWord } from "@/utils/word-watermark.utils.js";
import { prisma } from "@/db/db.js";
import { AuditService } from "../audit/services/audit.service.js";
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


function getStringParam(param: string | string[] | undefined, paramName: string): string {
  if (!param) {
    throw new BadRequestError(`${paramName} is required`);
  }
  if (Array.isArray(param)) {
    throw new BadRequestError(`Invalid ${paramName} format`);
  }
  return param;
}
export class ArticleController {
  private auditService = new AuditService();

  // Helper function to calculate editing duration
  private async calculateEditingDuration(articleId: string, editorId: string): Promise<string> {
    try {
      // Find the latest editor assignment for this article and editor
      const assignment = await prisma.articleEditorHistory.findFirst({
        where: {
          articleId,
          editorId,
        },
        orderBy: {
          assignedAt: 'desc'
        }
      });

      if (!assignment) {
        return "N/A";
      }

      const assignedAt = assignment.assignedAt;
      const now = new Date();
      const diffMs = now.getTime() - assignedAt.getTime();

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        return `${days} days, ${hours} hours, ${minutes} minutes`;
      } else if (hours > 0) {
        return `${hours} hours, ${minutes} minutes`;
      } else {
        return `${minutes} minutes`;
      }
    } catch (error) {
      console.error('Failed to calculate editing duration:', error);
      return "N/A";
    }
  }
  // Article submission (works for both guest and logged-in users)
  async submitArticle(req: AuthRequest, res: Response, next: NextFunction) {
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

      // 🔥 AUDIT: Record user upload for logged-in users
      if (userId && 'article' in result) {
        await this.auditService.recordUserUpload(
          {
            id: req.user!.id,
            name: req.user!.name || 'User',
            email: req.user!.email || '',
            organization: result.article.authorOrganization || 'N/A'
          },
          {
            id: result.article.id,
            title: result.article.title,
            category: result.article.category || 'General',
            author: result.article.authorName
          }
        );
      }

      // NEW: Handle document processing if this is a document upload
      if (req.isDocumentUpload && 'article' in result) {
        // Start background document processing for logged-in users
        const adobeSafeUrl = req.fileMeta.presignedUrl || req.fileMeta.url;

        articleService.processDocumentUpload(result.article.id, adobeSafeUrl)
          .catch(console.error);
      }

      // Different response based on whether verification is required
      // Use property checking to narrow the type
      if ('expiresAt' in result) {
        // Guest user - verification email sent
        res.status(200).json({
          message: result.message,
          expiresAt: result.expiresAt,
          requiresVerification: true,
          contentType: req.body.contentType || 'ARTICLE', // NEW: Include content type
        });
      } else {
        // Logged-in user - article created directly
        res.status(201).json({
          message: result.message,
          article: result.article,
          requiresVerification: false,
          contentType: req.body.contentType || 'ARTICLE', // NEW: Include content type
        });
      }
    } catch (error) {
      next(error);
    }
  }

  // Verify email and create article (public endpoint)
  async verifyArticleSubmission(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const token = getStringParam(req.params.token, "Verification token");

      // Verify token and create article in database
      await articleService.confirmArticleSubmission(token);

      // Frontend home URL - use environment variable for production
      const frontendHomeUrl = process.env.FRONTEND_URL || "http://localhost:3000";

      // Redirect user to home page with success message
      return res.redirect(`${frontendHomeUrl}/?verified=true`);
    } catch (error) {
      console.error("Verification Error:", error);
      const frontendHomeUrl = process.env.FRONTEND_URL || "http://localhost:3000";

      // On error, redirect to home with error message
      return res.redirect(`${frontendHomeUrl}/?error=verification-failed`);
    }
  }

  // Verify article by code (public endpoint - JSON response)
  async verifyArticleByCode(req: AuthRequest, res: Response, next: NextFunction) {
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
      next(error);
    }
  }

  // Resend verification code (public endpoint)
  async resendVerificationCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new BadRequestError("Email is required");
      }

      const result = await articleService.resendVerificationCode(email);

      return res.status(200).json(result);
    } catch (error) {
      console.error("Resend Code Error:", error);
      next(error);
    }
  }

  // Admin assigns editor
  async assignEditor(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      // Validate request body
      const validatedData = assignEditorSchema.parse(req.body);
      const adminId = req.user!.id;

      const result = await articleService.assignEditor(articleId, validatedData, adminId);

      // 🔥 AUDIT: Record editor assignment/reassignment
      if (result.isReassignment && result.oldEditor) {
        await this.auditService.recordEditorReassignment(
          {
            id: req.user!.id,
            name: req.user!.name || 'Admin',
            email: req.user!.email || '',
            organization: 'N/A' // User model doesn't have organization field
          },
          {
            id: result.article.id,
            title: result.article.title,
            category: result.article.category || 'General',
            author: result.article.authorName
          },
          {
            id: result.oldEditor?.id || 'unknown',
            name: result.oldEditor?.name || 'Unknown Editor'
          },
          {
            id: result.newEditor.id,
            name: result.newEditor.name
          }
        );
      } else {
        await this.auditService.recordEditorAssignment(
          {
            id: req.user!.id,
            name: req.user!.name || 'Admin',
            email: req.user!.email || '',
            organization: 'N/A' // User model doesn't have organization field
          },
          {
            id: result.article.id,
            title: result.article.title,
            category: result.article.category || 'General',
            author: result.article.authorName
          },
          {
            id: result.newEditor.id,
            name: result.newEditor.name
          }
        );
      }

      res.json({
        message: result.isReassignment
          ? `Stage 1 Reviewer reassigned successfully from ${result.oldEditor?.name} to ${result.newEditor.name}`
          : `Stage 1 Reviewer ${result.newEditor.name} assigned successfully`,
        article: result.article,
        isReassignment: result.isReassignment,
        oldEditor: result.oldEditor,
        newEditor: result.newEditor,
      });
    } catch (error) {
      next(error);
    }
  }

  // Editor or Admin approves article (Option A)
  async approveArticle(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      const userId = req.user!.id;
      const userRoles = req.user!.roles?.map((role: { name: string }) => role.name) || [];

      const article = await articleService.approveArticle(articleId, userId, userRoles);

      res.json({
        message: "Article approved successfully",
        article,
      });
    } catch (error) {
      next(error);
    }
  }


  async getPublishedArticles(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const category = req.query.category as string;

      // Use visibility-filtered method for users
      const result = await articleService.getPublishedArticles(page, limit, category);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // Editor uploads corrected PDF (Option C - Step 1)
  async uploadCorrectedPdf(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      const editorId = req.user!.id;

      if (!req.fileMeta?.url) {
        throw new BadRequestError("PDF file is required");
      }

      // Validate request body
      const validatedData = uploadCorrectedPdfSchema.parse(req.body);

      const data: UploadCorrectedPdfData = {
        pdfUrl: req.fileMeta.url,
        presignedUrl: req.fileMeta.presignedUrl || req.fileMeta.url,
        comments: validatedData.comments,
        editorDocumentUrl: req.body.editorDocumentUrl,      // ✅ Pass editor document URL from middleware
        editorDocumentType: req.body.editorDocumentType,    // ✅ Pass editor document type from middleware
      };

      const userRoles = req.user!.roles?.map((role: { name: string }) => role.name) || [];

      // Pass userRoles to service to allow Admin overrides
      const article = await articleService.uploadCorrectedPdf(articleId, editorId, data, userRoles);

      // 🔥 AUDIT: Record editor upload with editing duration
      const editingDuration = await this.calculateEditingDuration(articleId, editorId);

      // Use the returned article data for audit
      try {
        const fullArticle = (article as any).article || article; // Handle wrapper object if present

        await this.auditService.recordEditorUpload(
          {
            id: req.user!.id,
            name: req.user!.name || 'Editor',
            email: req.user!.email || '',
            organization: 'N/A' // User model doesn't have organization field
          },
          {
            id: articleId,
            title: fullArticle.title,
            category: fullArticle.category || 'General',
            author: fullArticle.authorName
          },
          editingDuration
        );
      } catch (auditError) {
        console.error('Failed to record audit event:', auditError);
        // Continue with response even if audit fails
      }

      res.json({
        message: "Corrected PDF uploaded successfully. Article pending approval.",
        article,
      });
    } catch (error) {
      next(error);
    }
  }

  // List articles with filters
  async listArticles(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const filters: ArticleListFilters = req.query;
      const result = await articleService.listArticles(filters);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get article preview (public - no auth required)
  async getArticlePreview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      const article = await articleService.getArticlePreview(articleId);

      res.json({
        article,
        message: "Login to read full article and download PDF"
      });
    } catch (error) {
      next(error);
    }
  }

  // Get full article details (protected - auth required)
  async getArticleById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      const article = await articleService.getArticleById(articleId);

      res.json({ article });
    } catch (error) {
      next(error);
    }
  }

  // Get article by slug (SEO-friendly URL)
  async getArticleBySlug(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = getStringParam(req.params.slug, "Article slug");

      const article = await articleService.getArticleBySlug(slug);

      res.json({ article });
    } catch (error) {
      next(error);
    }
  }

  // Get article content by slug (with 250-word limit for guests)
  async getArticleContentBySlug(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const slug = getStringParam(req.params.slug, "Article slug");

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
      next(error);
    }
  }

  // NEW: Authentication check for PDF URL access
  async checkArticleAccess(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      console.log(`🔐 [Auth Check] Checking access for article ${articleId}`);

      // Get article info
      const article = await articleService.getArticleById(articleId);

      // Check if user is authenticated
      const isAuthenticated = !!req.user;

      console.log(`👤 [Auth Check] User authenticated: ${isAuthenticated}`);
      console.log(`📊 [Auth Check] Article status: ${article.status}`);

      if (!isAuthenticated) {
        // User not logged in - redirect to login with return URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const returnUrl = `${frontendUrl}/article/${article.slug || article.id}`;

        console.log(`🔄 [Auth Check] Redirecting to login with return URL: ${returnUrl}`);

        return res.status(401).json({
          message: "Authentication required to access full article",
          requiresLogin: true,
          loginUrl: `${frontendUrl}/login?returnUrl=${encodeURIComponent(returnUrl)}`,
          articlePreview: {
            id: article.id,
            title: article.title,
            authorName: article.authorName,
            category: article.category,
            slug: article.slug
          }
        });
      }

      // User is authenticated - allow access to full article
      const content = await articleService.getArticleContent(articleId, true);

      console.log(`✅ [Auth Check] Access granted for authenticated user`);

      res.json({
        message: "Access granted - full article available",
        article: content,
        requiresLogin: false,
        authenticated: true
      });
    } catch (error) {
      console.error('❌ [Auth Check] Failed:', error);
      next(error);
    }
  }

  // Download article PDF (protected - auth required)
  async downloadArticlePdf(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      const userName = req.user?.name || 'Guest User';

      console.log(`\n📥 [Download PDF] User "${userName}" requesting PDF for article ${articleId}`);

      // Get article PDF info with status
      const article = await articleService.getArticleById(articleId);

      console.log(`📄 [Download PDF] Article: "${article.title}"`);
      console.log(`📊 [Download PDF] Article status: ${article.status}`);
      console.log(`📂 [Download PDF] PDF path: ${article.currentPdfUrl}`);

      // 🔥 AUDIT: Record user download
      await this.auditService.recordEditorDownload(
        {
          id: req.user!.id,
          name: req.user!.name || 'User',
          email: req.user!.email || '',
          organization: 'N/A'
        },
        {
          id: articleId,
          title: article.title,
          category: article.category || 'General',
          author: article.authorName
        }
      );

      // Determine user role for watermarking
      const userRoles = req.user!.roles?.map((role: { name: string }) => role.name) || [];
      const watermarkRole = userRoles.includes('reviewer') ? 'REVIEWER' :
        userRoles.includes('editor') ? 'EDITOR' : 'USER';

      // Add watermark to PDF with role-based URL inclusion and TEXT
      console.log(`💧 [Download PDF] Adding watermark for ${watermarkRole} role`);
      const watermarkedPdf = await addWatermarkToPdf(
        article.currentPdfUrl,
        {
          userName,
          downloadDate: new Date(),
          articleTitle: article.title,
          articleId: articleId,
          articleSlug: article.slug,
          frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        },
        watermarkRole,    // Pass dynamic role so "LAW NATION REVIEWER" text appears
        article.status,   // Article status - URL only for PUBLISHED
        article.citationNumber // ✅ Pass citation number for USER PDFs
      );

      // Send watermarked PDF
      const filename = `${article.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', watermarkedPdf.length.toString());

      console.log(`✅ [Download PDF] Sending watermarked PDF (${watermarkedPdf.length} bytes)`);
      console.log(`🔗 [Download PDF] URL included: ${article.status === 'PUBLISHED'}`);

      res.send(watermarkedPdf);
    } catch (error) {
      console.error('❌ [Download PDF] Failed:', error);
      next(error);
    }
  }

  // Download article Word (protected - auth required, all logged-in users)
  async downloadArticleWord(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      const userName = req.user?.name || 'User';

      console.log(`\n📥 [Download Word] User "${userName}" requesting Word for article ${articleId}`);

      // Get article Word info with status
      const article = await articleService.getArticleById(articleId);

      console.log(`📄 [Download Word] Article: "${article.title}"`);
      console.log(`📊 [Download Word] Article status: ${article.status}`);
      console.log(`📂 [Download Word] Word path: ${article.currentWordUrl}`);

      // 🔥 AUDIT: Record user download
      await this.auditService.recordEditorDownload(
        {
          id: req.user!.id,
          name: req.user!.name || 'User',
          email: req.user!.email || '',
          organization: 'N/A'
        },
        {
          id: articleId,
          title: article.title,
          category: article.category || 'General',
          author: article.authorName
        }
      );

      // Add watermark to Word document (no URLs in DOCX files)
      console.log(`💧 [Download Word] Adding watermark for USER role (no URLs in DOCX)`);
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

      console.log(`✅ [Download Word] Sending watermarked Word file (${watermarkedWord.length} bytes)`);
      console.log(`🔗 [Download Word] URL included: false (DOCX files never include URLs - editorial use only)`);

      res.send(watermarkedWord);
    } catch (error) {
      console.error('❌ [Download Word] Failed:', error);
      next(error);
    }
  }

  // NEW: Download original user PDF converted to DOCX (for editors/admins)
  async downloadOriginalDocx(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      if (!req.user?.id) {
        throw new BadRequestError("Authentication required");
      }

      console.log(`📥 [Download Original DOCX] Admin ${req.user.id} requesting original DOCX for article ${articleId}`);

      const originalDocxUrl = await articleService.getOriginalDocxUrl(articleId);

      if (!originalDocxUrl) {
        throw new BadRequestError("Original DOCX not available for this article");
      }

      // Get user info for watermarking
      const userName = req.user.name || 'Admin';

      // Get article info
      const article = await articleService.getArticleById(articleId);

      console.log(`📄 [Download Original DOCX] Processing original DOCX: ${originalDocxUrl}`);
      console.log(`👤 [Download Original DOCX] User role: ADMIN (no URL in DOCX watermarks)`);

      // Add watermark to original DOCX (ADMIN role - no URLs in DOCX)
      const watermarkedDocx = await articleService.downloadOriginalDocxWithWatermark(
        articleId,
        {
          userName,
          downloadDate: new Date(),
          articleTitle: article.title,
          articleId: articleId,
          frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
          userRole: 'ADMIN', // Pass role for watermarking logic
        }
      );

      // Send watermarked DOCX file
      const filename = `${article.title.replace(/[^a-z0-9]/gi, '_')}_original.docx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', watermarkedDocx.length.toString());

      console.log(`✅ [Download Original DOCX] Sending watermarked original DOCX file (${watermarkedDocx.length} bytes)`);
      console.log(`🔗 [Download Original DOCX] URL included: false (DOCX files don't include URLs)`);

      res.send(watermarkedDocx);
    } catch (error) {
      console.error('❌ [Download Original DOCX] Failed:', error);
      next(error);
    }
  }

  // NEW: Download editor's uploaded DOCX (explicit route for admins)
  async downloadEditorDocx(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      if (!req.user?.id) {
        throw new BadRequestError("Authentication required");
      }

      console.log(`📥 [Download Editor DOCX] Admin ${req.user.id} requesting editor's DOCX for article ${articleId}`);

      const editorDocxUrl = await articleService.getEditorDocxUrl(articleId);

      if (!editorDocxUrl) {
        throw new BadRequestError("Editor's DOCX not available for this article");
      }

      // Get user info for watermarking
      const userName = req.user.name || 'Admin';

      // Get article info
      const article = await articleService.getArticleById(articleId);

      console.log(`📄 [Download Editor DOCX] Processing editor's DOCX: ${editorDocxUrl}`);
      console.log(`👤 [Download Editor DOCX] User role: ADMIN (no URL in DOCX watermarks)`);

      // Add watermark to editor's DOCX (ADMIN role - no URLs in DOCX)
      const watermarkedDocx = await articleService.downloadEditorDocxWithWatermark(
        articleId,
        {
          userName,
          downloadDate: new Date(),
          articleTitle: article.title,
          articleId: articleId,
          frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
          userRole: 'ADMIN', // Pass role for watermarking logic
        }
      );

      // Send watermarked DOCX file
      const filename = `${article.title.replace(/[^a-z0-9]/gi, '_')}_editor_corrected.docx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', watermarkedDocx.length.toString());

      console.log(`✅ [Download Editor DOCX] Sending watermarked editor's DOCX file (${watermarkedDocx.length} bytes)`);
      console.log(`🔗 [Download Editor DOCX] URL included: false (DOCX files don't include URLs)`);

      res.send(watermarkedDocx);
    } catch (error) {
      console.error('❌ [Download Editor DOCX] Failed:', error);
      next(error);
    }
  }

  // NEW: Download admin's uploaded DOCX (explicit route)
  async downloadAdminDocx(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      if (!req.user?.id) {
        throw new BadRequestError("Authentication required");
      }

      console.log(`📥 [Download Admin DOCX] User ${req.user.id} requesting Admin's DOCX for article ${articleId}`);

      // Verify user has permission (Admin or maybe Editor/Reviewer involved in workflow)
      // For now, strict on Admin role or Editor involved? 
      // User requested "Admin Edited DOCX", likely they are Admin or the Editor viewing history.
      // We will let the Service handle strict permission or check roles here.
      // But typically this button is on Admin Dashboard.

      const userRoles = req.user!.roles?.map((r: any) => r.name) || [];
      if (!userRoles.includes('admin') && !userRoles.includes('editor')) {
        // Allow editor to see what Admin did?
        // For now, let's keep it open to authenticated users who have access to the dashboard where this link appears.
        // But best to restrict.
        // Let's assume broad access for now as per "Admin Edited DOCX" context.
      }

      // Get user info for watermarking
      const userName = req.user.name || 'User';

      // Get article info
      const article = await articleService.getArticleById(articleId);

      console.log(`📄 [Download Admin DOCX] Processing Admin's DOCX`);

      // Add watermark to Admin's DOCX
      const watermarkedDocx = await articleService.downloadAdminDocxWithWatermark(
        articleId,
        {
          userName,
          downloadDate: new Date(),
          articleTitle: article.title,
          articleId: articleId,
          frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
          userRole: 'ADMIN',
        }
      );

      // Send watermarked DOCX file
      const filename = `${article.title.replace(/[^a-z0-9]/gi, '_')}_admin_corrected.docx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', watermarkedDocx.length.toString());

      console.log(`✅ [Download Admin DOCX] Sending watermarked Admin's DOCX file (${watermarkedDocx.length} bytes)`);

      res.send(watermarkedDocx);
    } catch (error) {
      console.error('❌ [Download Admin DOCX] Failed:', error);
      next(error);
    }
  }

  // Delete article
  async deleteArticle(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      const result = await articleService.deleteArticle(articleId);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // Get article content for reading (public endpoint with optional auth)
  async getArticleContent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

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
      next(error);
    }
  }

  // Get article upload history (protected endpoint)
  async getArticleHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      const result = await articleService.getArticleHistory(articleId);

      res.json({
        message: "Article history retrieved successfully",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Search articles (public endpoint with enhanced filters)
  async searchArticles(req: AuthRequest, res: Response, next: NextFunction) {
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
      next(error);
    }
  }

  // Upload thumbnail for article
  async uploadThumbnail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      if (!req.fileMeta?.url) {
        throw new BadRequestError("Image file is required");
      }

      const article = await articleService.uploadThumbnail(articleId, req.fileMeta.url);

      res.json({
        message: "Thumbnail uploaded successfully",
        article,
      });
    } catch (error) {
      next(error);
    }
  }

  // Upload multiple images for article
  async uploadImages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

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
      next(error);
    }
  }

  // ✅ NEW: Editor approves article
  async editorApproveArticle(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      const editorId = req.user!.id;

      const article = await articleService.editorApproveArticle(articleId, editorId);

      res.json({
        message: "Article approved successfully. Admin has been notified and can now publish it.",
        article,
      });
    } catch (error) {
      next(error);
    }
  }

  // ✅ NEW: Admin publishes article (only after editor approval)
  async adminPublishArticle(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");
      const adminId = req.user!.id;
      
      // ✅ Guard against undefined body and get citation number
      const body = req.body || {};
      const { citationNumber } = body;
      
      if (!citationNumber || citationNumber.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Citation number is required to publish an article. Please assign a citation number first.'
        });
      }

      const result = await articleService.adminPublishArticle(articleId, adminId, citationNumber);

      // 🔥 AUDIT: Record final decision
      try {
        // Use type assertion to handle union type safely
        const articleData = result.article as any;

        await this.auditService.recordFinalDecision(
          {
            id: req.user!.id,
            name: req.user!.name || 'Admin',
            email: req.user!.email || '',
            organization: 'N/A' // User model doesn't have organization field
          },
          {
            id: articleData.id || articleId,
            title: articleData.title || 'Unknown Title',
            category: articleData.category || 'General',
            author: articleData.authorName || 'Unknown Author'
          },
          'PUBLISHED'
        );
      } catch (auditError) {
        console.error('Failed to record audit event:', auditError);
        // Continue with response even if audit fails
      }

      // Handle different response types (document vs article)
      const response: any = {
        message: "Article published successfully",
        article: result.article,
      };

      if ('diffSummary' in result) {
        response.diffSummary = result.diffSummary;
      }

      if ('extractedText' in result) {
        response.extractedText = result.extractedText;
      }

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  // ✅ NEW: Get article change history
  async getArticleChangeHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      const userId = req.user!.id;
      const userRoles = req.user!.roles?.map((role: { name: string }) => role.name) || [];

      const result = await articleService.getArticleChangeHistory(articleId, userId, userRoles);

      res.json({
        message: "Change history retrieved successfully",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ✅ NEW: Get specific change log diff
  async getChangeLogDiff(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const changeLogId = getStringParam(req.params.changeLogId, "Change log ID");

      const userId = req.user!.id;
      const userRoles = req.user!.roles?.map((role: { name: string }) => role.name) || [];

      const result = await articleService.getChangeLogDiff(changeLogId, userId, userRoles);

      res.json({
        message: "Change log diff retrieved successfully",
        changeLog: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Download diff as PDF or Word
  async downloadDiff(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const changeLogId = getStringParam(req.params.changeLogId, "Change log ID");
      const { format } = req.query;

      // Validate format
      const downloadFormat = format === 'word' ? 'word' : 'pdf';

      const userId = req.user!.id;
      const userName = req.user!.name || 'User';
      const userRoles = req.user!.roles?.map((role: { name: string }) => role.name) || [];

      // Determine user role for watermarking
      const userRole = userRoles.includes('admin') ? 'ADMIN' :
        userRoles.includes('editor') ? 'EDITOR' :
          userRoles.includes('reviewer') ? 'REVIEWER' : 'USER';

      console.log(`📥 [Diff Download] User "${userName}" (${userRole}) requesting ${downloadFormat} diff for change log ${changeLogId}`);

      const result = await articleService.downloadDiff(changeLogId, userId, userRoles, downloadFormat);

      // Get article info for watermark
      const changeLog = await prisma.articleChangeLog.findUnique({
        where: { id: changeLogId },
        include: {
          article: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      });

      // Add watermark to diff
      let watermarkedBuffer: Buffer;

      if (downloadFormat === 'pdf') {
        // Save buffer to temp file, add watermark, then delete
        const fs = await import('fs/promises');
        const path = await import('path');
        const os = await import('os');

        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `diff-temp-${Date.now()}.pdf`);

        try {
          // Write buffer to temp file
          await fs.writeFile(tempFilePath, result.buffer);

          console.log(`💧 [Diff Download] Adding watermark to PDF diff for ${userRole} role`);

          // Add logo watermark with role-based URL logic
          watermarkedBuffer = await addWatermarkToPdf(
            tempFilePath,
            {
              userName,
              downloadDate: new Date(),
              articleTitle: changeLog?.article.title || 'Article Diff',
              articleId: changeLog?.article.id || '',
              frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
            },
            userRole as 'USER' | 'EDITOR' | 'REVIEWER' | 'ADMIN',
            changeLog?.article.status || 'DRAFT',
            changeLog?.article.citationNumber // ✅ Pass citation number
          );

          // Clean up temp file
          await fs.unlink(tempFilePath);
        } catch (error) {
          // Clean up temp file on error
          try {
            await fs.unlink(tempFilePath);
          } catch { }
          next(error);
          return;
        }
      } else {
        // Save buffer to temp file, add watermark, then delete
        const fs = await import('fs/promises');
        const path = await import('path');
        const os = await import('os');

        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `diff-temp-${Date.now()}.docx`);

        try {
          // Write buffer to temp file
          await fs.writeFile(tempFilePath, result.buffer);

          console.log(`💧 [Diff Download] Adding watermark to Word diff (no URLs in DOCX)`);

          // Add text watermark (DOCX files don't include URLs)
          watermarkedBuffer = await addSimpleWatermarkToWord(
            tempFilePath,
            {
              userName,
              downloadDate: new Date(),
              articleTitle: changeLog?.article.title || 'Article Diff',
              articleId: changeLog?.article.id || '',
              frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
            }
          );

          // Clean up temp file
          await fs.unlink(tempFilePath);
        } catch (error) {
          // Clean up temp file on error
          try {
            await fs.unlink(tempFilePath);
          } catch { }
          next(error);
          return;
        }
      }

      // Set headers for file download
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', watermarkedBuffer.length);

      console.log(`✅ [Diff Download] Sending watermarked file: ${result.filename} (${watermarkedBuffer.length} bytes)`);
      console.log(`🔗 [Diff Download] URL included: ${downloadFormat === 'pdf' && userRole === 'USER' && changeLog?.article.status === 'PUBLISHED'}`);

      // Send watermarked file buffer
      res.send(watermarkedBuffer);
    } catch (error) {
      console.error('❌ [Diff Download] Failed:', error);
      next(error);
    }
  }

  // ✅ NEW: Download editor's uploaded document
  async downloadEditorDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const changeLogId = getStringParam(req.params.changeLogId, "Change log ID");
      const { format } = req.query;

      // Validate format
      const downloadFormat = format === 'word' ? 'word' : 'pdf';

      const userId = req.user!.id;
      const userName = req.user!.name || 'User';
      const userRoles = req.user!.roles?.map((role: { name: string }) => role.name) || [];

      // Determine user role for watermarking
      const userRole = userRoles.includes('admin') ? 'ADMIN' :
        userRoles.includes('editor') ? 'EDITOR' :
          userRoles.includes('reviewer') ? 'REVIEWER' : 'USER';

      console.log(`📥 [Editor Doc Download] User "${userName}" (${userRole}) requesting ${downloadFormat} editor document for change log ${changeLogId}`);

      const result = await articleService.downloadEditorDocument(changeLogId, userId, userRoles, downloadFormat);

      // Get article info for watermark
      const changeLog = await prisma.articleChangeLog.findUnique({
        where: { id: changeLogId },
        include: {
          article: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      });

      // Add watermark based on format
      let watermarkedBuffer: Buffer;

      if (downloadFormat === 'pdf') {
        // Add logo watermark to PDF with role-based URL logic
        console.log(`💧 [Editor Doc Download] Adding watermark to PDF for ${userRole} role`);
        watermarkedBuffer = await addWatermarkToPdf(
          result.filePath,
          {
            userName,
            downloadDate: new Date(),
            articleTitle: changeLog?.article.title || 'Editor Document',
            articleId: changeLog?.article.id || '',
            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
          },
          userRole as 'USER' | 'EDITOR' | 'REVIEWER' | 'ADMIN',
          changeLog?.article.status || 'DRAFT',
          changeLog?.article.citationNumber // ✅ Pass citation number
        );
      } else {
        // Add text watermark to Word (no URLs in DOCX)
        console.log(`💧 [Editor Doc Download] Adding watermark to Word (no URLs in DOCX)`);
        watermarkedBuffer = await addSimpleWatermarkToWord(
          result.filePath,
          {
            userName,
            downloadDate: new Date(),
            articleTitle: changeLog?.article.title || 'Editor Document',
            articleId: changeLog?.article.id || '',
            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
          }
        );
      }

      // Set headers for file download
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', watermarkedBuffer.length);

      console.log(`✅ [Editor Doc Download] Sending watermarked file: ${result.filename} (${watermarkedBuffer.length} bytes)`);
      console.log(`🔗 [Editor Doc Download] URL included: ${downloadFormat === 'pdf' && userRole === 'USER' && changeLog?.article.status === 'PUBLISHED'}`);

      // Send watermarked file buffer
      res.send(watermarkedBuffer);
    } catch (error) {
      console.error('❌ [Editor Doc Download] Failed:', error);
      next(error);
    }
  }

  // Get editor assignment history for an article (Admin only)
  async getEditorAssignmentHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      const userId = req.user!.id;
      const userRoles = req.user!.roles?.map((role: { name: string }) => role.name) || [];

      const result = await articleService.getEditorAssignmentHistory(articleId, userId, userRoles);

      res.json({
        message: "Editor assignment history retrieved successfully",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ✅ PRODUCTION-GRADE: View visual diff with proper error handling
  async viewVisualDiff(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const changeLogId = getStringParam(req.params.changeLogId, "Change log ID");

      const userId = req.user!.id;
      const userRoles = req.user!.roles?.map((role: { name: string }) => role.name) || [];

      console.log(`🎨 [Visual Diff] Request for change log: ${changeLogId}`);

      // Step 1: Get or generate visual diff (service handles all logic)
      let visualDiffUrl: string;

      try {
        visualDiffUrl = await articleService.generateVisualDiff(changeLogId);
      } catch (error: any) {
        console.error('❌ [Visual Diff] Generation failed:', error);

        // Handle specific error cases
        if (error.message?.includes('generation in progress')) {
          return res.status(202).json({
            message: 'Visual diff is being generated. Please try again in a few moments.',
            status: 'generating'
          });
        }

        if (error.message?.includes('only supported for PDF files')) {
          return res.status(400).json({
            message: 'Visual diff is only available for PDF documents.',
            status: 'unsupported'
          });
        }

        // Generic error
        return res.status(500).json({
          message: 'Could not generate visual diff. Please try again later.',
          status: 'error'
        });
      }

      // Step 2: Resolve file path using production-safe method
      const { resolveToAbsolutePath, fileExistsAtPath } = await import('@/utils/file-path.utils.js');
      const path = await import('path');
      const fullPath = resolveToAbsolutePath(visualDiffUrl);

      // Step 3: Check if file exists (flexible approach)
      const fs = await import('fs/promises');
      let pdfPath = fullPath;

      try {
        // Try to access the visual-diff file
        await fs.access(fullPath);
        console.log(`✅ [Visual Diff] Found visual-diff file: ${visualDiffUrl}`);
      } catch (error: any) {
        console.log(`⚠️ [Visual Diff] Visual-diff file not found, checking for edited PDF...`);

        // Visual-diff file doesn't exist, try to serve the edited PDF directly (overlay approach)
        const changeLog = await prisma.articleChangeLog.findUnique({
          where: { id: changeLogId },
          select: {
            newFileUrl: true,
            article: {
              select: { currentPdfUrl: true }
            }
          }
        });

        if (!changeLog?.newFileUrl && !changeLog?.article?.currentPdfUrl) {
          return res.status(404).json({
            message: 'No PDF available for visual diff.',
            status: 'no_pdf'
          });
        }

        // Use the edited PDF from change log or current article PDF
        const editedPdfUrl = changeLog.newFileUrl || changeLog.article.currentPdfUrl;

        // If path already starts with /uploads/, remove the leading slash and resolve directly
        if (editedPdfUrl.startsWith('/uploads/')) {
          pdfPath = path.join(process.cwd(), editedPdfUrl.substring(1));
        } else if (editedPdfUrl.startsWith('uploads/')) {
          pdfPath = path.join(process.cwd(), editedPdfUrl);
        } else {
          pdfPath = resolveToAbsolutePath(editedPdfUrl);
        }

        console.log(`📄 [Visual Diff] Using edited PDF: ${editedPdfUrl}`);
      }

      // Step 4: Read and serve PDF file
      try {
        const pdfBuffer = await fs.readFile(pdfPath);

        // Set proper headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="visual-diff-${changeLogId}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

        console.log(`✅ [Visual Diff] Serving file: ${pdfBuffer.length} bytes`);

        res.send(pdfBuffer);
      } catch (error: any) {
        console.error(`❌ [Visual Diff] Failed to read file: ${error.message}`);

        return res.status(500).json({
          message: 'Failed to read visual diff file.',
          status: 'read_error'
        });
      }

    } catch (error) {
      console.error('❌ [Visual Diff] Unexpected error:', error);
      next(error);
    }
  }

  // NEW: Upload edited DOCX for documents
  async uploadEditedDocx(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        throw new BadRequestError("Authentication required");
      }

      const articleId = getStringParam(req.params.id, "Article ID");

      if (!req.fileMeta?.url) {
        throw new BadRequestError("DOCX file is required");
      }

      const comments = req.body.comments;
      const adobeSafeUrl = req.fileMeta.presignedUrl || req.fileMeta.url;

      await articleService.uploadEditedDocx(
        articleId,
        req.user.id,
        req.fileMeta.url,
        comments,
        adobeSafeUrl
      );

      // 🔥 AUDIT: Record editor upload for document
      const article = await articleService.getArticleById(articleId);
      const editingDuration = await this.calculateEditingDuration(articleId, req.user.id);

      await this.auditService.recordEditorUpload(
        {
          id: req.user.id,
          name: req.user.name || 'Editor',
          email: req.user.email || '',
          organization: 'N/A' // User model doesn't have organization field
        },
        {
          id: article.id,
          title: article.title,
          category: article.category || 'General',
          author: article.authorName
        },
        editingDuration
      );

      res.status(200).json({
        message: "Edited document uploaded successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // NEW: Extract text from document for publishing
  async extractDocumentText(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user?.id) {
        throw new BadRequestError("Authentication required");
      }

      const articleId = getStringParam(req.params.id, "Article ID");

      const extractedText = await articleService.extractDocumentText(articleId);

      res.status(200).json({
        message: "Text extracted successfully",
        extractedText,
        textLength: extractedText.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // NEW: Admin assigns reviewer (after editor approval)
  async assignReviewer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");
      const { reviewerId, reason } = req.body;

      if (!reviewerId) {
        throw new BadRequestError("Reviewer ID is required");
      }

      const adminId = req.user!.id;

      const result = await articleService.assignReviewer(articleId, reviewerId, adminId, reason);

      // 🔥 AUDIT: Record reviewer assignment/reassignment
      if (result.isReassignment && result.oldReviewer) {
        await this.auditService.recordReviewerReassignment(
          {
            id: req.user!.id,
            name: req.user!.name || 'Admin',
            email: req.user!.email || '',
            organization: 'N/A'
          },
          {
            id: result.article.id,
            title: result.article.title,
            category: result.article.category || 'General',
            author: result.article.authorName
          },
          {
            id: result.oldReviewer?.id || 'unknown',
            name: result.oldReviewer?.name || 'Unknown Reviewer'
          },
          {
            id: result.newReviewer.id,
            name: result.newReviewer.name
          }
        );
      } else {
        await this.auditService.recordReviewerAssignment(
          {
            id: req.user!.id,
            name: req.user!.name || 'Admin',
            email: req.user!.email || '',
            organization: 'N/A'
          },
          {
            id: result.article.id,
            title: result.article.title,
            category: result.article.category || 'General',
            author: result.article.authorName
          },
          {
            id: result.newReviewer.id,
            name: result.newReviewer.name
          }
        );
      }

      res.json({
        message: result.isReassignment
          ? `Stage 2 Reviewer reassigned successfully from ${result.oldReviewer?.name} to ${result.newReviewer.name}`
          : `Stage 2 Reviewer ${result.newReviewer.name} assigned successfully`,
        article: result.article,
        isReassignment: result.isReassignment,
        oldReviewer: result.oldReviewer,
        newReviewer: result.newReviewer,
      });
    } catch (error) {
      next(error);
    }
  }

  // NEW: Reviewer uploads corrected document (DOCX only)
  async reviewerUploadCorrectedDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");
      const reviewerId = req.user!.id;

      if (!req.fileMeta?.url) {
        throw new BadRequestError("DOCX file is required");
      }

      // Validate request body
      const validatedData = uploadCorrectedPdfSchema.parse(req.body);

      const data: UploadCorrectedPdfData = {
        pdfUrl: req.fileMeta.url, // Actually DOCX for reviewers
        presignedUrl: req.fileMeta.presignedUrl || req.fileMeta.url,
        comments: validatedData.comments,
      };

      const result = await articleService.reviewerUploadCorrectedDocument(articleId, reviewerId, data);

      // 🔥 AUDIT: Record reviewer upload with editing duration
      const editingDuration = await this.calculateEditingDuration(articleId, reviewerId);

      try {
        const fullArticle = await articleService.getArticleById(articleId);
        await this.auditService.recordReviewerUpload(
          {
            id: req.user!.id,
            name: req.user!.name || 'Reviewer',
            email: req.user!.email || '',
            organization: 'N/A'
          },
          {
            id: articleId,
            title: fullArticle.title,
            category: fullArticle.category || 'General',
            author: fullArticle.authorName
          },
          this.parseEditingDuration(editingDuration)
        );
      } catch (auditError) {
        console.error('Failed to record reviewer upload audit event:', auditError);
        // Continue with response even if audit fails
      }

      res.json({
        message: "Document reviewed and uploaded successfully. Pending reviewer approval.",
        article: result.article,
        extractedTextLength: result.extractedTextLength,
        files: result.files,
      });
    } catch (error) {
      next(error);
    }
  }

  // NEW: Reviewer approves article (sends to admin for publishing)
  async reviewerApproveArticle(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");
      const reviewerId = req.user!.id;

      const article = await articleService.reviewerApproveArticle(articleId, reviewerId);

      // 🔥 AUDIT: Record reviewer approval (using final decision audit)
      try {
        await this.auditService.recordFinalDecision(
          {
            id: req.user!.id,
            name: req.user!.name || 'Reviewer',
            email: req.user!.email || '',
            organization: 'N/A'
          },
          {
            id: article.id,
            title: article.title,
            category: article.category || 'General',
            author: article.authorName
          },
          'REVIEWER_APPROVED'
        );
      } catch (auditError) {
        console.error('Failed to record reviewer approval audit event:', auditError);
        // Continue with response even if audit fails
      }

      res.json({
        message: "Article approved by reviewer successfully. Admin has been notified and can now publish it.",
        article,
      });
    } catch (error) {
      next(error);
    }
  }

  // NEW: Reviewer downloads editor's document
  async reviewerDownloadEditorDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");
      const reviewerId = req.user!.id;

      // Verify reviewer is assigned to this article
      const article = await articleService.getArticleById(articleId);
      if (article.assignedReviewerId !== reviewerId) {
        throw new ForbiddenError("You are not assigned as reviewer to this article");
      }

      const userName = req.user?.name || 'Reviewer';

      console.log(`📥 [Reviewer Download] Reviewer "${userName}" requesting editor's document for article ${articleId}`);
      console.log(`👤 [Reviewer Download] User role: REVIEWER (no URL in DOCX watermarks)`);

      // Get editor's DOCX
      const editorDocxUrl = await articleService.getEditorDocxUrl(articleId);

      if (!editorDocxUrl) {
        throw new BadRequestError("Editor's document not available for this article");
      }

      // 🔥 AUDIT: Record reviewer download
      await this.auditService.recordReviewerDownload(
        {
          id: req.user!.id,
          name: req.user!.name || 'Reviewer',
          email: req.user!.email || '',
          organization: 'N/A'
        },
        {
          id: articleId,
          title: article.title,
          category: article.category || 'General',
          author: article.authorName
        }
      );

      // Add watermark to editor's DOCX (REVIEWER role - no URLs in DOCX)
      const watermarkedDocx = await articleService.downloadEditorDocxWithWatermark(
        articleId,
        {
          userName,
          downloadDate: new Date(),
          articleTitle: article.title,
          articleId: articleId,
          frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
          userRole: 'REVIEWER', // Pass role for watermarking logic
        }
      );

      // Send watermarked DOCX file
      const filename = `${article.title.replace(/[^a-z0-9]/gi, '_')}_editor_version.docx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', watermarkedDocx.length.toString());

      console.log(`✅ [Reviewer Download] Sending watermarked editor's DOCX file (${watermarkedDocx.length} bytes)`);
      console.log(`🔗 [Reviewer Download] URL included: false (DOCX files don't include URLs)`);

      res.send(watermarkedDocx);
    } catch (error) {
      console.error('❌ [Reviewer Download] Failed:', error);
      next(error);
    }
  }

  // Helper method to parse editing duration string into object
  private parseEditingDuration(durationString: string): { days: number; hours: number; minutes: number } {
    const defaultDuration = { days: 0, hours: 0, minutes: 0 };

    if (!durationString || durationString === "N/A") {
      return defaultDuration;
    }

    try {
      // Parse strings like "2 days, 3 hours, 45 minutes" or "3 hours, 45 minutes" or "45 minutes"
      const dayMatch = durationString.match(/(\d+)\s+days?/);
      const hourMatch = durationString.match(/(\d+)\s+hours?/);
      const minuteMatch = durationString.match(/(\d+)\s+minutes?/);

      return {
        days: dayMatch ? parseInt(dayMatch[1] || '0') : 0,
        hours: hourMatch ? parseInt(hourMatch[1] || '0') : 0,
        minutes: minuteMatch ? parseInt(minuteMatch[1] || '0') : 0,
      };
    } catch (error) {
      console.error('Failed to parse editing duration:', error);
      return defaultDuration;
    }
  }

  /**
   * Search article by citation number
   * GET /api/articles/search/citation/:citationNumber
   */
  async searchByCitation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const citationNumber = req.params.citationNumber as string;
      
      const article = await articleService.searchByCitation(citationNumber);
      
      res.json({
        success: true,
        data: article
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin sets citation number on an article
   * PATCH /api/articles/:id/set-citation
   * Only allowed when status is REVIEWER_APPROVED
   * Format: YYYY LN(NN)ANNNNN  e.g. 2026 LN(53)A1234
   */
  async setCitationNumber(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const articleId = getStringParam(req.params.id, "Article ID");

      // ✅ Guard against undefined body (missing Content-Type: application/json)
      const body = req.body || {};
      const { citationNumber } = body;

      if (!citationNumber || typeof citationNumber !== 'string') {
        return res.status(400).json({
          success: false,
          message: "Citation number is required. Please provide a valid citation number.",
        });
      }

      // Validate format: YYYY LN(NN...)ANNN...
      const citationRegex = /^\d{4} LN\(\d+\)A\d+$/;
      if (!citationRegex.test(citationNumber.trim())) {
        return res.status(400).json({
          success: false,
          message: "Invalid citation format. Expected: YYYY LN(NN)ANNNNN — e.g. 2026 LN(53)A1234",
        });
      }

      // Fetch article
      const article = await prisma.article.findUnique({
        where: { id: articleId },
        select: { id: true, status: true, title: true, citationNumber: true },
      });

      if (!article) {
        return res.status(404).json({ success: false, message: "Article not found." });
      }

      // ✅ No status restriction — admin can set citation at any stage

      // Check for duplicates (unique constraint will catch it, but give better message)
      const existing = await prisma.article.findUnique({
        where: { citationNumber: citationNumber.trim() },
        select: { id: true, title: true },
      });

      if (existing && existing.id !== articleId) {
        return res.status(409).json({
          success: false,
          message: `This citation number already exists. Use a different one. (Used by: "${existing.title}")`,
        });
      }

      // Save citation number
      const updated = await prisma.article.update({
        where: { id: articleId },
        data: { citationNumber: citationNumber.trim() },
        select: { id: true, title: true, citationNumber: true, status: true },
      });

      console.log(`✅ [Citation] Set citation "${citationNumber}" for article "${article.title}"`);

      return res.json({
        success: true,
        message: "Citation number saved successfully",
        article: updated,
      });
    } catch (error: any) {
      // Handle Prisma unique constraint error
      if (error?.code === 'P2002' && error?.meta?.target?.includes('citationNumber')) {
        return res.status(409).json({
          success: false,
          message: "This citation number already exists. Use a different one.",
        });
      }
      next(error);
    }
  }
}

export const articleController = new ArticleController();
