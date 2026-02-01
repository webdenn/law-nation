import { prisma } from "@/db/db.js";
import { articleSubmissionService } from "./services/article-submission.service.js";
import { articleWorkflowService } from "./services/article-workflow.service.js";
import { articleDownloadService } from "./services/article-download.service.js";
import { articleSearchService } from "./services/article-search.service.js";
import { articleQueryService } from "./services/article-query.service.js";
import { articleMediaService } from "./services/article-media.service.js";
import { adobeService } from "@/services/adobe.service.js";
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
    async submitArticle(data, userId) {
        return articleSubmissionService.submitArticle(data, userId);
    }
    // NEW: Document processing with Adobe services
    async processDocumentUpload(articleId, pdfPath) {
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
            await adobeService.addWatermarkToDocx(docxPath, watermarkedDocxPath, watermarkData);
            // Update article with DOCX URL
            await prisma.article.update({
                where: { id: articleId },
                data: {
                    currentWordUrl: watermarkedDocxPath,
                    status: 'PENDING_ADMIN_REVIEW', // Ready for admin assignment
                },
            });
            console.log(`✅ [Document] Document processing completed for ${articleId}`);
        }
        catch (error) {
            console.error(`❌ [Document] Processing failed for ${articleId}:`, error);
            throw error;
        }
    }
    // NEW: Handle editor DOCX upload for documents
    async uploadEditedDocx(articleId, editorId, docxPath, comments) {
        try {
            console.log(`✏️ [Document] Editor ${editorId} uploading edited DOCX for ${articleId}`);
            const article = await prisma.article.findUnique({
                where: { id: articleId },
            });
            if (!article || article.contentType !== 'DOCUMENT') {
                throw new Error('Article not found or not a document');
            }
            // Add watermark to edited DOCX
            const watermarkData = {
                userName: 'LAW NATION EDITOR',
                downloadDate: new Date(),
                articleTitle: article.title,
                articleId: articleId,
                frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
            };
            const watermarkedDocxPath = docxPath.replace('.docx', '_edited_watermarked.docx');
            await adobeService.addWatermarkToDocx(docxPath, watermarkedDocxPath, watermarkData);
            // Convert to PDF for preview
            const pdfPath = docxPath.replace('.docx', '_edited.pdf');
            await adobeService.convertDocxToPdf(watermarkedDocxPath, pdfPath);
            // Update article
            await prisma.article.update({
                where: { id: articleId },
                data: {
                    currentWordUrl: watermarkedDocxPath,
                    currentPdfUrl: pdfPath,
                    status: 'EDITOR_APPROVED',
                },
            });
            console.log(`✅ [Document] Editor DOCX upload completed for ${articleId}`);
        }
        catch (error) {
            console.error(`❌ [Document] Editor DOCX upload failed:`, error);
            throw error;
        }
    }
    // NEW: Extract text for document publishing
    async extractDocumentText(articleId) {
        try {
            const article = await prisma.article.findUnique({
                where: { id: articleId },
            });
            if (!article || article.contentType !== 'DOCUMENT' || !article.currentWordUrl) {
                throw new Error('Document not ready for text extraction');
            }
            // Extract text using Adobe services
            const extractedText = await adobeService.extractTextFromDocx(article.currentWordUrl);
            // Update article with extracted text
            await prisma.article.update({
                where: { id: articleId },
                data: {
                    content: extractedText, // Store in content field for compatibility
                },
            });
            return extractedText;
        }
        catch (error) {
            console.error(`❌ [Document] Text extraction failed:`, error);
            throw error;
        }
    }
    async confirmArticleSubmission(token) {
        return articleSubmissionService.confirmArticleSubmission(token);
    }
    async verifyArticleByCode(email, code) {
        return articleSubmissionService.verifyArticleByCode(email, code);
    }
    async resendVerificationCode(email) {
        return articleSubmissionService.resendVerificationCode(email);
    }
    // WORKFLOW
    async assignEditor(articleId, data, adminId) {
        return articleWorkflowService.assignEditor(articleId, data, adminId);
    }
    async uploadCorrectedPdf(articleId, editorId, data) {
        return articleWorkflowService.uploadCorrectedPdf(articleId, editorId, data);
    }
    async editorApproveArticle(articleId, editorId) {
        return articleWorkflowService.editorApproveArticle(articleId, editorId);
    }
    async approveArticle(articleId, userId, userRoles, newPdfUrl) {
        return articleWorkflowService.approveArticle(articleId, userId, userRoles, newPdfUrl);
    }
    async adminPublishArticle(articleId, adminId) {
        return articleWorkflowService.adminPublishArticle(articleId, adminId);
    }
    async deleteArticle(articleId) {
        return articleWorkflowService.deleteArticle(articleId);
    }
    //  DOWNLOADS
    async getArticlePdfUrl(articleId) {
        return articleDownloadService.getArticlePdfUrl(articleId);
    }
    async getArticleWordUrl(articleId) {
        return articleDownloadService.getArticleWordUrl(articleId);
    }
    // NEW: Get original DOCX URL (converted from user's PDF)
    async getOriginalDocxUrl(articleId) {
        return articleDownloadService.getOriginalDocxUrl(articleId);
    }
    // NEW: Download original DOCX with watermark
    async downloadOriginalDocxWithWatermark(articleId, watermarkData) {
        return articleDownloadService.downloadOriginalDocxWithWatermark(articleId, watermarkData);
    }
    // NEW: Get editor's DOCX URL (corrected version)
    async getEditorDocxUrl(articleId) {
        return articleDownloadService.getEditorDocxUrl(articleId);
    }
    // NEW: Download editor's DOCX with watermark
    async downloadEditorDocxWithWatermark(articleId, watermarkData) {
        return articleDownloadService.downloadEditorDocxWithWatermark(articleId, watermarkData);
    }
    async downloadDiff(changeLogId, userId, userRoles, format = "pdf") {
        return articleDownloadService.downloadDiff(changeLogId, userId, userRoles, format);
    }
    async downloadEditorDocument(changeLogId, userId, userRoles, format = "pdf") {
        return articleDownloadService.downloadEditorDocument(changeLogId, userId, userRoles, format);
    }
    async generateVisualDiff(changeLogId) {
        return articleDownloadService.generateVisualDiff(changeLogId);
    }
    //  SEARCH
    async searchArticles(searchQuery, filters) {
        return articleSearchService.searchArticles(searchQuery, filters);
    }
    //  QUERY
    async listArticles(filters) {
        return articleQueryService.listArticles(filters);
    }
    async getArticleById(articleId) {
        return articleQueryService.getArticleById(articleId);
    }
    async getArticleBySlug(slug) {
        return articleQueryService.getArticleBySlug(slug);
    }
    async getArticlePreview(articleId) {
        return articleQueryService.getArticlePreview(articleId);
    }
    async getArticleContent(articleId, isAuthenticated = false) {
        return articleQueryService.getArticleContent(articleId, isAuthenticated);
    }
    async getArticleHistory(articleId) {
        return articleQueryService.getArticleHistory(articleId);
    }
    async getArticleChangeHistory(articleId, userId, userRoles) {
        return articleQueryService.getArticleChangeHistory(articleId, userId, userRoles);
    }
    async getChangeLogDiff(changeLogId, userId, userRoles) {
        return articleQueryService.getChangeLogDiff(changeLogId, userId, userRoles);
    }
    async getEditorAssignmentHistory(articleId, userId, userRoles) {
        return articleQueryService.getEditorAssignmentHistory(articleId, userId, userRoles);
    }
    //  MEDIA
    async uploadThumbnail(articleId, thumbnailUrl) {
        return articleMediaService.uploadThumbnail(articleId, thumbnailUrl);
    }
    async uploadImages(articleId, imageUrls) {
        return articleMediaService.uploadImages(articleId, imageUrls);
    }
}
export const articleService = new ArticleService();
//# sourceMappingURL=article.service.js.map