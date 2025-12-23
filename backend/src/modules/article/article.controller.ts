import type { Response } from "express";
import type { AuthRequest } from "@/types/auth-request.js";
import { articleService } from "./article.service.js";
import { BadRequestError } from "@/utils/http-errors.util.js";
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

      const article = await articleService.confirmArticleSubmission(token);

      res.status(200).json({
        message: "Email verified! Your article has been submitted successfully.",
        article: {
          id: article.id,
          title: article.title,
          status: article.status,
        },
      });
    } catch (error) {
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

  // Editor approves article (Option A)
  async approveArticle(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }

      const editorId = req.user!.id;

      const article = await articleService.approveArticle(articleId, editorId);

      res.json({
        message: "Article approved successfully",
        article,
      });
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

  // ✅ Is function ko ArticleController class ke andar add karo
async listArticlesByEditor(req: AuthRequest, res: Response) {
  try {
    const { editorId } = req.params;

    if (!editorId) {
      throw new BadRequestError("Editor ID is required");
    }

    // Aapke service layer ka use karte hue data fetch karein
    // Hum filters mein assignedEditorId bhej rahe hain
    const result = await articleService.listArticles({ 
      assignedEditorId: editorId 
    } as any);

    res.json(result);
  } catch (error) {
    throw error; // Global error handler ise handle kar lega
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

  // Download article PDF (protected - auth required)
  async downloadArticlePdf(req: AuthRequest, res: Response) {
    try {
      const articleId = req.params.id;
      if (!articleId) {
        throw new BadRequestError("Article ID is required");
      }

      const article = await articleService.getArticlePdfUrl(articleId);

      res.json({
        pdfUrl: article.currentPdfUrl,
        title: article.title,
        message: "PDF ready for download",
      });
    } catch (error) {
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
}

export const articleController = new ArticleController();
