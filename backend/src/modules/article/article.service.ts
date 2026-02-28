import { prisma } from "@/db/db.js";
import { articleSubmissionService } from "./services/article-submission.service.js";
import { articleWorkflowService } from "./services/article-workflow.service.js";
import { articleDownloadService } from "./services/article-download.service.js";
import { articleSearchService } from "./services/article-search.service.js";
import { articleQueryService } from "./services/article-query.service.js";
import { articleMediaService } from "./services/article-media.service.js";
import { adobeService } from "@/services/adobe.service.js";
import { addSimpleWatermarkToWord } from "@/utils/word-watermark.utils.js";
import type {
  ArticleSubmissionData,
  ArticleListFilters,
  AssignEditorData,
  UploadCorrectedPdfData,
} from "./types/article-submission.type.js";
import fs from "fs";
import path from "path";
import * as Diff from "diff";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
//Main service that delegates to specialized services
//This maintains backward compatibility while using the new modular architecture:
//ArticleSubmissionService: Handles submission and verification
//ArticleWorkflowService: Handles editor assignment, corrections, approvals
//ArticleDownloadService: Handles PDF/Word downloads and diffs
//ArticleSearchService: Handles full-text search
//ArticleQueryService: Handles listing and getting articles
//ArticleMediaService: Handles thumbnails and images
export class ArticleService {
  // SUBMISSION
  async submitArticle(data: ArticleSubmissionData, userId?: string) {
    return articleSubmissionService.submitArticle(data, userId);
  }

  // NEW: Document processing with Adobe services
  async processDocumentUpload(articleId: string, pdfPath: string) {
    try {
      console.log(`📄 [Document] Processing document ${articleId} with Adobe services`);

      // Convert PDF to DOCX using Adobe
      const docxPath = pdfPath.replace('.pdf', '.docx');
      await adobeService.convertPdfToDocx(pdfPath, docxPath);

      // Add watermark to DOCX
      const watermarkData = {
        userName: 'LAW NATION USER',
        downloadDate: new Date(),
        articleTitle: 'Document',
        articleId: articleId,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      };

      const watermarkedDocxPath = docxPath.replace('.docx', '_watermarked.docx');
      const watermarkedBuffer = await addSimpleWatermarkToWord(docxPath, watermarkData);
      fs.writeFileSync(watermarkedDocxPath, watermarkedBuffer);

      // Update article with DOCX URL
      await prisma.article.update({
        where: { id: articleId },
        data: {
          currentWordUrl: watermarkedDocxPath,
          status: 'PENDING_ADMIN_REVIEW', // Ready for admin assignment
        },
      });

      console.log(`✅ [Document] Document processing completed for ${articleId}`);

    } catch (error) {
      console.error(`❌ [Document] Processing failed for ${articleId}:`, error);
      throw error;
    }
  }

  // NEW: Handle editor DOCX upload for documents
  async uploadEditedDocx(articleId: string, editorId: string, docxPath: string, comments?: string, adobeSafeUrl?: string) {
    try {
      console.log(`✏️ [Document] Editor ${editorId} uploading edited DOCX for ${articleId}`);

      const article = await prisma.article.findUnique({
        where: { id: articleId },
      });

      if (!article || article.contentType !== 'DOCUMENT') {
        throw new Error('Article not found or not a document');
      }

      // 1. Get Previous Version (for Diff)
      let oldPdfText = "";
      if (article.currentPdfUrl) {
        try {
          // Check if it's a URL or local path
          let oldPdfPath = article.currentPdfUrl;

          if (oldPdfPath.startsWith('http://') || oldPdfPath.startsWith('https://')) {
            // It's a Supabase URL - we need to download it first or extract text differently
            console.log(`🌐 [Document] Supabase URL detected for diff: ${oldPdfPath}`);
            // For now, skip diff generation for Supabase URLs
            // TODO: Implement URL-based text extraction
            console.log(`⚠️ [Document] Skipping diff generation for Supabase URL`);
          } else {
            // It's a local path - handle as before
            if (oldPdfPath.startsWith('/') && !fs.existsSync(oldPdfPath)) {
              oldPdfPath = path.join(process.cwd(), oldPdfPath.substring(1));
            } else if (!path.isAbsolute(oldPdfPath)) {
              oldPdfPath = path.join(process.cwd(), oldPdfPath);
            }

            if (fs.existsSync(oldPdfPath)) {
              const dataBuffer = fs.readFileSync(oldPdfPath);
              const data = await pdfParse(dataBuffer);
              oldPdfText = data.text || "";
              console.log(`📄 [Document] Extracted ${oldPdfText.length} chars from previous PDF`);
            } else {
              console.log(`⚠️ [Document] Previous PDF file not found: ${oldPdfPath}`);
            }
          }
        } catch (e) {
          console.warn("Could not read old PDF for diff:", e);
        }
      }

      // 2. Add watermark to edited DOCX
      const watermarkData = {
        userName: 'LAW NATION EDITOR',
        downloadDate: new Date(),
        articleTitle: article.title,
        articleId: articleId,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      };

      const watermarkedDocxPath = docxPath.replace('.docx', '_edited_watermarked.docx');
      const watermarkedBuffer = await addSimpleWatermarkToWord(docxPath, watermarkData);
      fs.writeFileSync(watermarkedDocxPath, watermarkedBuffer);

      // 3. Convert to PDF for preview
      const pdfPath = docxPath.replace('.docx', '_edited.pdf');
      await adobeService.convertDocxToPdf(watermarkedDocxPath, pdfPath);

      // 4. Extract Text from New PDF
      let newPdfText = "";
      try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const data = await pdfParse(dataBuffer);
        newPdfText = data.text;
      } catch (e) {
        console.warn("Could not read new PDF for diff:", e);
      }

      // 5. Generate Diff
      const diffResult = Diff.diffLines(oldPdfText, newPdfText);
      const stats = { added: 0, removed: 0, modified: 0 };
      const formattedDiff = {
        added: [] as any[],
        removed: [] as any[],
        modified: [] as any[],
        summary: stats
      };

      // Simple processing of diff results for stats and structure
      let lineNumOld = 1;
      let lineNumNew = 1;

      diffResult.forEach((part) => {
        const lines = part.value.split('\n').filter(l => l.trim());
        if (lines.length === 0) return;

        if (part.added) {
          stats.added += lines.length;
          lines.forEach(line => formattedDiff.added.push({ newLineNumber: lineNumNew++, content: line }));
        } else if (part.removed) {
          stats.removed += lines.length;
          lines.forEach(line => formattedDiff.removed.push({ oldLineNumber: lineNumOld++, content: line }));
        } else {
          // Unchanged
          lineNumOld += lines.length;
          lineNumNew += lines.length;
        }
      });
      // Detect modified (heuristic: remove followed by add) - simplifying for now to just A/R
      // stats is already updated by reference in formattedDiff.summary

      // 6. Create Change Log with Diff Data
      const versionCount = await prisma.articleChangeLog.count({ where: { articleId } });
      const versionNumber = versionCount + 1;

      await prisma.articleChangeLog.create({
        data: {
          articleId,
          editedBy: editorId,
          versionNumber,
          comments: comments || "Editor correction",
          diffData: formattedDiff as any,
          oldFileUrl: article.currentPdfUrl || "", // Required by schema
          newFileUrl: pdfPath,
          fileType: 'PDF', // We are comparing and storing PDF representations
          editorDocumentUrl: watermarkedDocxPath,
          editorDocumentType: 'DOCX',
          status: 'approved' // Set as approved/pending
        }
      });

      // 7. Update article
      await prisma.article.update({
        where: { id: articleId },
        data: {
          currentWordUrl: watermarkedDocxPath,
          currentPdfUrl: pdfPath,
          status: 'EDITOR_APPROVED',
        },
      });

      console.log(`✅ [Document] Editor DOCX upload completed for ${articleId}`);

    } catch (error) {
      console.error(`❌ [Document] Editor DOCX upload failed:`, error);
      throw error;
    }
  }

  // NEW: Extract text for document publishing
  async extractDocumentText(articleId: string) {
    try {
      const article = await prisma.article.findUnique({
        where: { id: articleId },
      });

      if (!article || article.contentType !== 'DOCUMENT' || !article.currentPdfUrl) {
        throw new Error('Document not ready for text extraction');
      }

      // Extract text using Adobe PDF extraction instead of mammoth
      const extractedText = await adobeService.extractTextFromPdf(article.currentPdfUrl);

      // Update article with extracted text
      await prisma.article.update({
        where: { id: articleId },
        data: {
          content: extractedText, // Store text in content field for compatibility
        },
      });

      return extractedText;

    } catch (error) {
      console.error(`❌ [Document] Text extraction failed:`, error);
      throw error;
    }
  }
  async confirmArticleSubmission(token: string) {
    return articleSubmissionService.confirmArticleSubmission(token);
  }
  async verifyArticleByCode(email: string, code: string) {
    return articleSubmissionService.verifyArticleByCode(email, code);
  }
  async resendVerificationCode(email: string) {
    return articleSubmissionService.resendVerificationCode(email);
  }
  // WORKFLOW
  async assignEditor(
    articleId: string,
    data: AssignEditorData,
    adminId: string
  ) {
    return articleWorkflowService.assignEditor(articleId, data, adminId);
  }
  async uploadCorrectedPdf(
    articleId: string,
    editorId: string,
    data: UploadCorrectedPdfData,
    userRoles: string[] = []
  ) {
    return articleWorkflowService.uploadCorrectedPdf(articleId, editorId, data, userRoles);
  }
  async editorApproveArticle(articleId: string, editorId: string) {
    return articleWorkflowService.editorApproveArticle(articleId, editorId);
  }

  // NEW: Reviewer workflow methods
  async assignReviewer(
    articleId: string,
    reviewerId: string,
    adminId: string,
    reason?: string
  ) {
    return articleWorkflowService.assignReviewer(articleId, reviewerId, adminId, reason);
  }

  async reviewerUploadCorrectedDocument(
    articleId: string,
    reviewerId: string,
    data: UploadCorrectedPdfData
  ) {
    return articleWorkflowService.reviewerUploadCorrectedDocument(articleId, reviewerId, data);
  }

  async reviewerApproveArticle(articleId: string, reviewerId: string) {
    return articleWorkflowService.reviewerApproveArticle(articleId, reviewerId);
  }
  async approveArticle(
    articleId: string,
    userId: string,
    userRoles: string[],
    newPdfUrl?: string
  ) {
    return articleWorkflowService.approveArticle(
      articleId,
      userId,
      userRoles,
      newPdfUrl
    );
  }
  async adminPublishArticle(articleId: string, adminId: string, citationNumber: string) {
    return articleWorkflowService.adminPublishArticle(articleId, adminId, citationNumber);
  }
  async deleteArticle(articleId: string) {
    return articleWorkflowService.deleteArticle(articleId);
  }
  //  DOWNLOADS
  async getArticlePdfUrl(articleId: string) {
    return articleDownloadService.getArticlePdfUrl(articleId);
  }
  async getArticleWordUrl(articleId: string) {
    return articleDownloadService.getArticleWordUrl(articleId);
  }

  // NEW: Get original DOCX URL (converted from user's PDF)
  async getOriginalDocxUrl(articleId: string) {
    return articleDownloadService.getOriginalDocxUrl(articleId);
  }

  // NEW: Download original DOCX with watermark
  async downloadOriginalDocxWithWatermark(articleId: string, watermarkData: any) {
    return articleDownloadService.downloadOriginalDocxWithWatermark(articleId, watermarkData);
  }

  // NEW: Get editor's DOCX URL (corrected version)
  async getEditorDocxUrl(articleId: string) {
    return articleDownloadService.getEditorDocxUrl(articleId);
  }

  // NEW: Download editor's DOCX with watermark
  async downloadEditorDocxWithWatermark(articleId: string, watermarkData: any) {
    return articleDownloadService.downloadReviewerDocxWithWatermark(articleId, watermarkData);
  }
  // NEW: Get admin DOCX URL
  async getAdminDocxUrl(articleId: string) {
    return articleDownloadService.getAdminDocxUrl(articleId);
  }

  // NEW: Download admin DOCX with watermark
  async downloadAdminDocxWithWatermark(articleId: string, watermarkData: any) {
    return articleDownloadService.downloadAdminDocxWithWatermark(articleId, watermarkData);
  }

  async downloadDiff(
    changeLogId: string,
    userId: string,
    userRoles: string[],
    format: "pdf" | "word" = "pdf"
  ) {
    return articleDownloadService.downloadDiff(
      changeLogId,
      userId,
      userRoles,
      format
    );
  }
  async downloadEditorDocument(
    changeLogId: string,
    userId: string,
    userRoles: string[],
    format: "pdf" | "word" = "pdf"
  ) {
    return articleDownloadService.downloadEditorDocument(
      changeLogId,
      userId,
      userRoles,
      format
    );
  }
  async generateVisualDiff(changeLogId: string): Promise<string> {
    return articleDownloadService.generateVisualDiff(changeLogId);
  }
  //  SEARCH
  async searchArticles(
    searchQuery: string,
    filters: {
      category?: string;
      author?: string;
      organization?: string;
      keyword?: string;
      dateFrom?: string;
      dateTo?: string;
      sortBy?: "relevance" | "date" | "title" | "author";
      sortOrder?: "asc" | "desc";
      minScore?: number;
      exclude?: string;
      citation?: string;
      page?: number;
      limit?: number;
    }
  ) {
    return articleSearchService.searchArticles(searchQuery, filters);
  }
  //  QUERY
  async listArticles(filters: ArticleListFilters) {
    return articleQueryService.listArticles(filters);
  }
  async getArticleById(articleId: string) {
    return articleQueryService.getArticleById(articleId);
  }
  async getArticleBySlug(slug: string) {
    return articleQueryService.getArticleBySlug(slug);
  }
  async getArticlePreview(articleId: string) {
    return articleQueryService.getArticlePreview(articleId);
  }
  async getArticleContent(articleId: string, isAuthenticated: boolean = false) {
    return articleQueryService.getArticleContent(articleId, isAuthenticated);
  }

  // NEW: Get published articles with visibility filtering (for users)
  async getPublishedArticles(page = 1, limit = 20, category?: string) {
    return articleQueryService.getPublishedArticles(page, limit, category);
  }

  // NEW: Get published articles without visibility filtering (for admin)
  async getPublishedArticlesForAdmin(page = 1, limit = 20, category?: string) {
    return articleQueryService.getPublishedArticlesForAdmin(page, limit, category);
  }
  async getArticleHistory(articleId: string) {
    return articleQueryService.getArticleHistory(articleId);
  }
  async getArticleChangeHistory(
    articleId: string,
    userId: string,
    userRoles: string[]
  ) {
    return articleQueryService.getArticleChangeHistory(
      articleId,
      userId,
      userRoles
    );
  }
  async getChangeLogDiff(
    changeLogId: string,
    userId: string,
    userRoles: string[]
  ) {
    return articleQueryService.getChangeLogDiff(changeLogId, userId, userRoles);
  }
  async getEditorAssignmentHistory(
    articleId: string,
    userId: string,
    userRoles: string[]
  ) {
    return articleQueryService.getEditorAssignmentHistory(
      articleId,
      userId,
      userRoles
    );
  }
  //  MEDIA
  async uploadThumbnail(articleId: string, thumbnailUrl: string) {
    return articleMediaService.uploadThumbnail(articleId, thumbnailUrl);
  }
  async uploadImages(articleId: string, imageUrls: string[]) {
    return articleMediaService.uploadImages(articleId, imageUrls);
  }

  async searchByCitation(citationNumber: string) {
    return articleQueryService.searchByCitation(citationNumber);
  }
}
export const articleService = new ArticleService();
