import { articleService } from "./article.service.js";
import { BadRequestError } from "@/utils/http-errors.util.js";
import { addWatermarkToPdf } from "@/utils/pdf-watermark.utils.js";
import { addSimpleWatermarkToWord } from "@/utils/word-watermark.utils.js";
import { prisma } from "@/db/db.js";
import { articleSubmissionSchema, assignEditorSchema, uploadCorrectedPdfSchema, } from "./validators/article.validator.js";
function getStringParam(param, paramName) {
    if (!param) {
        throw new BadRequestError(`${paramName} is required`);
    }
    if (Array.isArray(param)) {
        throw new BadRequestError(`Invalid ${paramName} format`);
    }
    return param;
}
export class ArticleController {
    // Article submission (works for both guest and logged-in users)
    async submitArticle(req, res, next) {
        try {
            if (!req.fileMeta?.url) {
                throw new BadRequestError("PDF file is required");
            }
            // Validate request body
            const validatedData = articleSubmissionSchema.parse(req.body);
            const data = {
                ...validatedData,
                pdfUrl: req.fileMeta.url,
                // Include image URLs if they were uploaded via uploadArticleFiles middleware
                thumbnailUrl: req.body.thumbnailUrl || undefined,
                imageUrls: req.body.imageUrls || undefined,
            };
            // Pass user ID if logged in (null for guests)
            const userId = req.user?.id;
            const result = await articleService.submitArticle(data, userId);
            // NEW: Handle document processing if this is a document upload
            if (req.isDocumentUpload && 'article' in result) {
                // Start background document processing for logged-in users
                articleService.processDocumentUpload(result.article.id, req.fileMeta.url)
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
            }
            else {
                // Logged-in user - article created directly
                res.status(201).json({
                    message: result.message,
                    article: result.article,
                    requiresVerification: false,
                    contentType: req.body.contentType || 'ARTICLE', // NEW: Include content type
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    // Verify email and create article (public endpoint)
    async verifyArticleSubmission(req, res, next) {
        try {
            const token = getStringParam(req.params.token, "Verification token");
            // Verify token and create article in database
            await articleService.confirmArticleSubmission(token);
            // Frontend home URL - use environment variable for production
            const frontendHomeUrl = process.env.FRONTEND_URL || "http://localhost:3000";
            // Redirect user to home page with success message
            return res.redirect(`${frontendHomeUrl}/law/home?verified=true`);
        }
        catch (error) {
            console.error("Verification Error:", error);
            const frontendHomeUrl = process.env.FRONTEND_URL || "http://localhost:3000";
            // On error, redirect to home with error message
            return res.redirect(`${frontendHomeUrl}/law/home?error=verification-failed`);
        }
    }
    // Verify article by code (public endpoint - JSON response)
    async verifyArticleByCode(req, res, next) {
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
        }
        catch (error) {
            console.error("Code Verification Error:", error);
            next(error);
        }
    }
    // Resend verification code (public endpoint)
    async resendVerificationCode(req, res, next) {
        try {
            const { email } = req.body;
            if (!email) {
                throw new BadRequestError("Email is required");
            }
            const result = await articleService.resendVerificationCode(email);
            return res.status(200).json(result);
        }
        catch (error) {
            console.error("Resend Code Error:", error);
            next(error);
        }
    }
    // Admin assigns editor
    async assignEditor(req, res, next) {
        try {
            const articleId = getStringParam(req.params.id, "Article ID");
            // Validate request body
            const validatedData = assignEditorSchema.parse(req.body);
            const adminId = req.user.id;
            const result = await articleService.assignEditor(articleId, validatedData, adminId);
            res.json({
                message: result.isReassignment
                    ? `Editor reassigned successfully from ${result.oldEditor?.name} to ${result.newEditor.name}`
                    : `Editor ${result.newEditor.name} assigned successfully`,
                article: result.article,
                isReassignment: result.isReassignment,
                oldEditor: result.oldEditor,
                newEditor: result.newEditor,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Editor or Admin approves article (Option A)
    async approveArticle(req, res, next) {
        try {
            const articleId = getStringParam(req.params.id, "Article ID");
            const userId = req.user.id;
            const userRoles = req.user.roles?.map((role) => role.name) || [];
            const article = await articleService.approveArticle(articleId, userId, userRoles);
            res.json({
                message: "Article approved successfully",
                article,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getPublishedArticles(req, res, next) {
        try {
            const filters = {
                ...req.query,
                status: "PUBLISHED"
            };
            const result = await articleService.listArticles(filters);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
    // Editor uploads corrected PDF (Option C - Step 1)
    async uploadCorrectedPdf(req, res, next) {
        try {
            const articleId = getStringParam(req.params.id, "Article ID");
            const editorId = req.user.id;
            if (!req.fileMeta?.url) {
                throw new BadRequestError("PDF file is required");
            }
            // Validate request body
            const validatedData = uploadCorrectedPdfSchema.parse(req.body);
            const data = {
                pdfUrl: req.fileMeta.url,
                comments: validatedData.comments,
                editorDocumentUrl: req.body.editorDocumentUrl, // ✅ Pass editor document URL from middleware
                editorDocumentType: req.body.editorDocumentType, // ✅ Pass editor document type from middleware
            };
            const article = await articleService.uploadCorrectedPdf(articleId, editorId, data);
            res.json({
                message: "Corrected PDF uploaded successfully. Article pending approval.",
                article,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // List articles with filters
    async listArticles(req, res, next) {
        try {
            const filters = req.query;
            const result = await articleService.listArticles(filters);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
    // Get article preview (public - no auth required)
    async getArticlePreview(req, res, next) {
        try {
            const articleId = getStringParam(req.params.id, "Article ID");
            const article = await articleService.getArticlePreview(articleId);
            res.json({
                article,
                message: "Login to read full article and download PDF"
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Get full article details (protected - auth required)
    async getArticleById(req, res, next) {
        try {
            const articleId = getStringParam(req.params.id, "Article ID");
            const article = await articleService.getArticleById(articleId);
            res.json({ article });
        }
        catch (error) {
            next(error);
        }
    }
    // Get article by slug (SEO-friendly URL)
    async getArticleBySlug(req, res, next) {
        try {
            const slug = getStringParam(req.params.slug, "Article slug");
            const article = await articleService.getArticleBySlug(slug);
            res.json({ article });
        }
        catch (error) {
            next(error);
        }
    }
    // Get article content by slug (with 250-word limit for guests)
    async getArticleContentBySlug(req, res, next) {
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
        }
        catch (error) {
            next(error);
        }
    }
    // Download article PDF (protected - auth required)
    async downloadArticlePdf(req, res, next) {
        try {
            const articleId = getStringParam(req.params.id, "Article ID");
            const userName = req.user?.name || 'Guest User';
            console.log(`📥 [Download] User "${userName}" requesting PDF for article ${articleId}`);
            // Get article PDF info
            const article = await articleService.getArticlePdfUrl(articleId);
            console.log(`📄 [Download] Article: "${article.title}"`);
            console.log(`📂 [Download] PDF path: ${article.currentPdfUrl}`);
            // Add watermark to PDF with clickable link
            const watermarkedPdf = await addWatermarkToPdf(article.currentPdfUrl, {
                userName,
                downloadDate: new Date(),
                articleTitle: article.title,
                articleId: articleId,
                frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
            });
            // Send watermarked PDF
            const filename = `${article.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', watermarkedPdf.length.toString());
            console.log(`✅ [Download] Sending watermarked PDF (${watermarkedPdf.length} bytes)`);
            res.send(watermarkedPdf);
        }
        catch (error) {
            console.error('❌ [Download] Failed:', error);
            next(error);
        }
    }
    // Download article Word (protected - auth required, all logged-in users)
    async downloadArticleWord(req, res, next) {
        try {
            const articleId = getStringParam(req.params.id, "Article ID");
            const userName = req.user?.name || 'User';
            console.log(`📥 [Download] User "${userName}" requesting Word for article ${articleId}`);
            // Get article Word info
            const article = await articleService.getArticleWordUrl(articleId);
            console.log(`📄 [Download] Article: "${article.title}"`);
            console.log(`📂 [Download] Word path: ${article.currentWordUrl}`);
            // Add watermark to Word document with clickable link
            const watermarkedWord = await addSimpleWatermarkToWord(article.currentWordUrl, {
                userName,
                downloadDate: new Date(),
                articleTitle: article.title,
                articleId: articleId,
                frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
            });
            // Send watermarked Word file
            const filename = `${article.title.replace(/[^a-z0-9]/gi, '_')}.docx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', watermarkedWord.length.toString());
            console.log(`✅ [Download] Sending watermarked Word file (${watermarkedWord.length} bytes)`);
            res.send(watermarkedWord);
        }
        catch (error) {
            console.error('❌ [Download] Failed:', error);
            next(error);
        }
    }
    // NEW: Download original user PDF converted to DOCX (for editors/admins)
    async downloadOriginalDocx(req, res, next) {
        try {
            const articleId = getStringParam(req.params.id, "Article ID");
            if (!req.user?.id) {
                throw new BadRequestError("Authentication required");
            }
            console.log(`📥 [Download Original DOCX] User ${req.user.id} requesting original DOCX for article ${articleId}`);
            const originalDocxUrl = await articleService.getOriginalDocxUrl(articleId);
            if (!originalDocxUrl) {
                throw new BadRequestError("Original DOCX not available for this article");
            }
            // Get user info for watermarking
            const userName = req.user.name || 'User';
            // Get article info
            const article = await articleService.getArticleById(articleId);
            console.log(`📄 [Download Original DOCX] Processing original DOCX: ${originalDocxUrl}`);
            // Add watermark to original DOCX
            const watermarkedDocx = await articleService.downloadOriginalDocxWithWatermark(articleId, {
                userName,
                downloadDate: new Date(),
                articleTitle: article.title,
                articleId: articleId,
                frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
            });
            // Send watermarked DOCX file
            const filename = `${article.title.replace(/[^a-z0-9]/gi, '_')}_original.docx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', watermarkedDocx.length.toString());
            console.log(`✅ [Download Original DOCX] Sending watermarked original DOCX file (${watermarkedDocx.length} bytes)`);
            res.send(watermarkedDocx);
        }
        catch (error) {
            console.error('❌ [Download Original DOCX] Failed:', error);
            next(error);
        }
    }
    // NEW: Download editor's uploaded DOCX (explicit route for admins)
    async downloadEditorDocx(req, res, next) {
        try {
            const articleId = getStringParam(req.params.id, "Article ID");
            if (!req.user?.id) {
                throw new BadRequestError("Authentication required");
            }
            console.log(`📥 [Download Editor DOCX] User ${req.user.id} requesting editor's DOCX for article ${articleId}`);
            const editorDocxUrl = await articleService.getEditorDocxUrl(articleId);
            if (!editorDocxUrl) {
                throw new BadRequestError("Editor's DOCX not available for this article");
            }
            // Get user info for watermarking
            const userName = req.user.name || 'Admin';
            // Get article info
            const article = await articleService.getArticleById(articleId);
            console.log(`📄 [Download Editor DOCX] Processing editor's DOCX: ${editorDocxUrl}`);
            // Add watermark to editor's DOCX
            const watermarkedDocx = await articleService.downloadEditorDocxWithWatermark(articleId, {
                userName,
                downloadDate: new Date(),
                articleTitle: article.title,
                articleId: articleId,
                frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
            });
            // Send watermarked DOCX file
            const filename = `${article.title.replace(/[^a-z0-9]/gi, '_')}_editor_corrected.docx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', watermarkedDocx.length.toString());
            console.log(`✅ [Download Editor DOCX] Sending watermarked editor's DOCX file (${watermarkedDocx.length} bytes)`);
            res.send(watermarkedDocx);
        }
        catch (error) {
            console.error('❌ [Download Editor DOCX] Failed:', error);
            next(error);
        }
    }
    // Delete article
    async deleteArticle(req, res, next) {
        try {
            const articleId = getStringParam(req.params.id, "Article ID");
            const result = await articleService.deleteArticle(articleId);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
    // Get article content for reading (public endpoint with optional auth)
    async getArticleContent(req, res, next) {
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
            }
            else {
                res.json({
                    message: "Article content retrieved successfully",
                    article,
                    requiresLogin: false,
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    // Get article upload history (protected endpoint)
    async getArticleHistory(req, res, next) {
        try {
            const articleId = getStringParam(req.params.id, "Article ID");
            const result = await articleService.getArticleHistory(articleId);
            res.json({
                message: "Article history retrieved successfully",
                ...result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Search articles (public endpoint with enhanced filters)
    async searchArticles(req, res, next) {
        try {
            const { q, category, author, organization, keyword, dateFrom, dateTo, sortBy, sortOrder, minScore, exclude, page, limit } = req.query;
            if (!q || typeof q !== "string") {
                throw new BadRequestError("Search query 'q' is required");
            }
            const filters = {
                page: page ? parseInt(page) : 1,
                limit: limit ? parseInt(limit) : 20,
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
                filters.sortBy = sortBy;
            }
            if (sortOrder && typeof sortOrder === "string") {
                filters.sortOrder = sortOrder;
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
        }
        catch (error) {
            next(error);
        }
    }
    // Upload thumbnail for article
    async uploadThumbnail(req, res, next) {
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
        }
        catch (error) {
            next(error);
        }
    }
    // Upload multiple images for article
    async uploadImages(req, res, next) {
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
        }
        catch (error) {
            next(error);
        }
    }
    // ✅ NEW: Editor approves article
    async editorApproveArticle(req, res, next) {
        try {
            const articleId = getStringParam(req.params.id, "Article ID");
            const editorId = req.user.id;
            const article = await articleService.editorApproveArticle(articleId, editorId);
            res.json({
                message: "Article approved successfully. Admin has been notified and can now publish it.",
                article,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // ✅ NEW: Admin publishes article (only after editor approval)
    async adminPublishArticle(req, res, next) {
        try {
            const articleId = getStringParam(req.params.id, "Article ID");
            const adminId = req.user.id;
            const result = await articleService.adminPublishArticle(articleId, adminId);
            // Handle different response types (document vs article)
            const response = {
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
        }
        catch (error) {
            next(error);
        }
    }
    // ✅ NEW: Get article change history
    async getArticleChangeHistory(req, res, next) {
        try {
            const articleId = getStringParam(req.params.id, "Article ID");
            const userId = req.user.id;
            const userRoles = req.user.roles?.map((role) => role.name) || [];
            const result = await articleService.getArticleChangeHistory(articleId, userId, userRoles);
            res.json({
                message: "Change history retrieved successfully",
                ...result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // ✅ NEW: Get specific change log diff
    async getChangeLogDiff(req, res, next) {
        try {
            const changeLogId = getStringParam(req.params.changeLogId, "Change log ID");
            const userId = req.user.id;
            const userRoles = req.user.roles?.map((role) => role.name) || [];
            const result = await articleService.getChangeLogDiff(changeLogId, userId, userRoles);
            res.json({
                message: "Change log diff retrieved successfully",
                changeLog: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Download diff as PDF or Word
    async downloadDiff(req, res, next) {
        try {
            const changeLogId = getStringParam(req.params.changeLogId, "Change log ID");
            const { format } = req.query;
            // Validate format
            const downloadFormat = format === 'word' ? 'word' : 'pdf';
            const userId = req.user.id;
            const userName = req.user.name || 'User';
            const userRoles = req.user.roles?.map((role) => role.name) || [];
            const result = await articleService.downloadDiff(changeLogId, userId, userRoles, downloadFormat);
            // Get article info for watermark
            const changeLog = await prisma.articleChangeLog.findUnique({
                where: { id: changeLogId },
                include: {
                    article: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            });
            // Add watermark to diff
            let watermarkedBuffer;
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
                    console.log(`💧 [Diff Download] Adding watermark to PDF diff`);
                    // Add logo watermark
                    watermarkedBuffer = await addWatermarkToPdf(tempFilePath, {
                        userName,
                        downloadDate: new Date(),
                        articleTitle: changeLog?.article.title || 'Article Diff',
                        articleId: changeLog?.article.id || '',
                        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
                    });
                    // Clean up temp file
                    await fs.unlink(tempFilePath);
                }
                catch (error) {
                    // Clean up temp file on error
                    try {
                        await fs.unlink(tempFilePath);
                    }
                    catch { }
                    next(error);
                    return;
                }
            }
            else {
                // Save buffer to temp file, add watermark, then delete
                const fs = await import('fs/promises');
                const path = await import('path');
                const os = await import('os');
                const tempDir = os.tmpdir();
                const tempFilePath = path.join(tempDir, `diff-temp-${Date.now()}.docx`);
                try {
                    // Write buffer to temp file
                    await fs.writeFile(tempFilePath, result.buffer);
                    console.log(`💧 [Diff Download] Adding watermark to Word diff`);
                    // Add text watermark
                    watermarkedBuffer = await addSimpleWatermarkToWord(tempFilePath, {
                        userName,
                        downloadDate: new Date(),
                        articleTitle: changeLog?.article.title || 'Article Diff',
                        articleId: changeLog?.article.id || '',
                        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
                    });
                    // Clean up temp file
                    await fs.unlink(tempFilePath);
                }
                catch (error) {
                    // Clean up temp file on error
                    try {
                        await fs.unlink(tempFilePath);
                    }
                    catch { }
                    next(error);
                    return;
                }
            }
            // Set headers for file download
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.setHeader('Content-Length', watermarkedBuffer.length);
            console.log(`✅ [Diff Download] Sending watermarked file: ${result.filename} (${watermarkedBuffer.length} bytes)`);
            // Send watermarked file buffer
            res.send(watermarkedBuffer);
        }
        catch (error) {
            console.error('❌ [Diff Download] Failed:', error);
            next(error);
        }
    }
    // ✅ NEW: Download editor's uploaded document
    async downloadEditorDocument(req, res, next) {
        try {
            const changeLogId = getStringParam(req.params.changeLogId, "Change log ID");
            const { format } = req.query;
            // Validate format
            const downloadFormat = format === 'word' ? 'word' : 'pdf';
            const userId = req.user.id;
            const userName = req.user.name || 'User';
            const userRoles = req.user.roles?.map((role) => role.name) || [];
            const result = await articleService.downloadEditorDocument(changeLogId, userId, userRoles, downloadFormat);
            // Get article info for watermark
            const changeLog = await prisma.articleChangeLog.findUnique({
                where: { id: changeLogId },
                include: {
                    article: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            });
            // Add watermark based on format
            let watermarkedBuffer;
            if (downloadFormat === 'pdf') {
                // Add logo watermark to PDF
                console.log(`💧 [Editor Doc Download] Adding watermark to PDF`);
                watermarkedBuffer = await addWatermarkToPdf(result.filePath, {
                    userName,
                    downloadDate: new Date(),
                    articleTitle: changeLog?.article.title || 'Editor Document',
                    articleId: changeLog?.article.id || '',
                    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
                });
            }
            else {
                // Add text watermark to Word
                console.log(`💧 [Editor Doc Download] Adding watermark to Word`);
                watermarkedBuffer = await addSimpleWatermarkToWord(result.filePath, {
                    userName,
                    downloadDate: new Date(),
                    articleTitle: changeLog?.article.title || 'Editor Document',
                    articleId: changeLog?.article.id || '',
                    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
                });
            }
            // Set headers for file download
            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.setHeader('Content-Length', watermarkedBuffer.length);
            console.log(`✅ [Editor Doc Download] Sending watermarked file: ${result.filename} (${watermarkedBuffer.length} bytes)`);
            // Send watermarked file buffer
            res.send(watermarkedBuffer);
        }
        catch (error) {
            console.error('❌ [Editor Doc Download] Failed:', error);
            next(error);
        }
    }
    // Get editor assignment history for an article (Admin only)
    async getEditorAssignmentHistory(req, res, next) {
        try {
            const articleId = getStringParam(req.params.id, "Article ID");
            const userId = req.user.id;
            const userRoles = req.user.roles?.map((role) => role.name) || [];
            const result = await articleService.getEditorAssignmentHistory(articleId, userId, userRoles);
            res.json({
                message: "Editor assignment history retrieved successfully",
                ...result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // ✅ PRODUCTION-GRADE: View visual diff with proper error handling
    async viewVisualDiff(req, res, next) {
        try {
            const changeLogId = getStringParam(req.params.changeLogId, "Change log ID");
            const userId = req.user.id;
            const userRoles = req.user.roles?.map((role) => role.name) || [];
            console.log(`🎨 [Visual Diff] Request for change log: ${changeLogId}`);
            // Step 1: Get or generate visual diff (service handles all logic)
            let visualDiffUrl;
            try {
                visualDiffUrl = await articleService.generateVisualDiff(changeLogId);
            }
            catch (error) {
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
            const { resolveUploadPath, fileExists } = await import('@/utils/file-path.utils.js');
            const path = await import('path');
            const fullPath = resolveUploadPath(visualDiffUrl);
            // Step 3: Check if file exists (flexible approach)
            const fs = await import('fs/promises');
            let pdfPath = fullPath;
            try {
                // Try to access the visual-diff file
                await fs.access(fullPath);
                console.log(`✅ [Visual Diff] Found visual-diff file: ${visualDiffUrl}`);
            }
            catch (error) {
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
                }
                else if (editedPdfUrl.startsWith('uploads/')) {
                    pdfPath = path.join(process.cwd(), editedPdfUrl);
                }
                else {
                    pdfPath = resolveUploadPath(editedPdfUrl);
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
            }
            catch (error) {
                console.error(`❌ [Visual Diff] Failed to read file: ${error.message}`);
                return res.status(500).json({
                    message: 'Failed to read visual diff file.',
                    status: 'read_error'
                });
            }
        }
        catch (error) {
            console.error('❌ [Visual Diff] Unexpected error:', error);
            next(error);
        }
    }
    // NEW: Upload edited DOCX for documents
    async uploadEditedDocx(req, res, next) {
        try {
            if (!req.user?.id) {
                throw new BadRequestError("Authentication required");
            }
            const articleId = getStringParam(req.params.id, "Article ID");
            if (!req.fileMeta?.url) {
                throw new BadRequestError("DOCX file is required");
            }
            const comments = req.body.comments;
            await articleService.uploadEditedDocx(articleId, req.user.id, req.fileMeta.url, comments);
            res.status(200).json({
                message: "Edited document uploaded successfully",
            });
        }
        catch (error) {
            next(error);
        }
    }
    // NEW: Extract text from document for publishing
    async extractDocumentText(req, res, next) {
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
        }
        catch (error) {
            next(error);
        }
    }
}
export const articleController = new ArticleController();
//# sourceMappingURL=article.controller.js.map