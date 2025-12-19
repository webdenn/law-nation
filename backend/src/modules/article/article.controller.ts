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
  // Guest submission (no auth required)
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

      const article = await articleService.submitArticle(data);

      res.status(201).json({
        message: "Article submitted successfully",
        article,
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
