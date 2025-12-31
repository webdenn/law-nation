import { prisma } from "@/db/db.js";
import { Prisma } from "@prisma/client";
import { NotFoundError, BadRequestError, ForbiddenError } from "@/utils/http-errors.util.js";
import {
  sendArticleSubmissionConfirmation,
  sendEditorAssignmentNotification,
  sendAuthorAssignmentNotification,
  sendArticleApprovalNotification,
  sendArticleCorrectionNotification,
  sendArticleVerificationCodeEmail,
  sendCoAuthorNotification,
} from "@/utils/email.utils.js";
import { VerificationService } from "@/utils/verification.utils.js";
import { extractPdfContent } from "@/utils/pdf-extract.utils.js";
import { ensureBothFormats, getFileType } from "@/utils/file-conversion.utils.js";
import { calculateFileDiff, generateDiffSummary, getFileTypeFromPath } from "@/utils/diff-calculator.utils.js";
import { notifyAdminOfEditorApproval, notifyUploaderOfPublication } from "@/utils/notification.utils.js";
import type {
  ArticleSubmissionData,
  ArticleVerificationMetadata,
  ArticleListFilters,
  AssignEditorData,
  UploadCorrectedPdfData,
} from "./types/article-submission.type.js";

export class ArticleService {
  // Step 1: Submit article (with or without verification based on user status)
  async submitArticle(data: ArticleSubmissionData, userId?: string) {
    // If user is logged in, create article directly (skip verification)
    if (userId) {
      return await this.createArticleDirectly(data, userId);
    }

    // Guest user - require email verification
    return await this.createVerificationRecord(data);
  }

  // Create article directly for logged-in users (no verification needed)
  private async createArticleDirectly(data: ArticleSubmissionData, userId: string) {
    const fileType = getFileType(data.pdfUrl);
    
    // Convert to ensure both formats exist
    console.log(`📄 [Logged-in User] Converting file to both formats: ${data.pdfUrl}`);
    const { pdfPath, wordPath } = await ensureBothFormats(data.pdfUrl);
    
    // Create article first to get ID
    const article = await prisma.article.create({
      data: {
        authorName: data.authorName,
        authorEmail: data.authorEmail,
        ...(data.authorPhone && { authorPhone: data.authorPhone }),
        ...(data.authorOrganization && { authorOrganization: data.authorOrganization }),
        ...(data.secondAuthorName && { secondAuthorName: data.secondAuthorName }),
        ...(data.secondAuthorEmail && { secondAuthorEmail: data.secondAuthorEmail }),
        ...(data.secondAuthorPhone && { secondAuthorPhone: data.secondAuthorPhone }),
        ...(data.secondAuthorOrganization && { secondAuthorOrganization: data.secondAuthorOrganization }),
        title: data.title,
        category: data.category,
        abstract: data.abstract,
        ...(data.keywords && { keywords: data.keywords }),
        ...(data.coAuthors && { coAuthors: data.coAuthors }),
        ...(data.remarksToEditor && { remarksToEditor: data.remarksToEditor }),
        originalPdfUrl: pdfPath,
        currentPdfUrl: pdfPath,
        originalWordUrl: wordPath,
        currentWordUrl: wordPath,
        originalFileType: fileType,
        thumbnailUrl: data.thumbnailUrl || null,
        status: "PENDING_ADMIN_REVIEW",
      },
    });

    // Extract text content and images from PDF
    let pdfContent = { text: "", html: "", images: [] as string[] };
    try {
      pdfContent = await extractPdfContent(pdfPath, article.id);
    } catch (error) {
      console.error("Failed to extract PDF content:", error);
      // Continue without content - PDF will still be available for download
    }

    // Combine uploaded images with extracted images
    const allImageUrls = [
      ...(data.imageUrls || []),
      ...(pdfContent.images || [])
    ];

    // Update article with extracted content and images
    const updatedArticle = await prisma.article.update({
      where: { id: article.id },
      data: {
        content: pdfContent.text || null,
        contentHtml: pdfContent.html || null,
        imageUrls: allImageUrls,
      },
    });

    // Send confirmation email to primary author
    await sendArticleSubmissionConfirmation(
      data.authorEmail,
      data.authorName,
      data.title,
      updatedArticle.id
    );

    // Send notification email to second author if exists
    if (data.secondAuthorEmail && data.secondAuthorName) {
      await sendCoAuthorNotification(
        data.secondAuthorEmail,
        data.secondAuthorName,
        data.authorName,
        data.title,
        updatedArticle.id
      );
    }

    return {
      message: 'Article submitted successfully',
      article: updatedArticle,
      requiresVerification: false,
    };
  }

  // Create verification record for guest users
  private async createVerificationRecord(data: ArticleSubmissionData) {
    // Create verification record with 48-hour TTL and 6-digit code
    const { token, code, expiresAt } = await VerificationService.createVerificationRecord(
      data.authorEmail,
      'ARTICLE',
      {
        ...data,
        tempPdfPath: data.pdfUrl, // Store temp file path
      } as ArticleVerificationMetadata,
      48, // TTL hours
      true // Include verification code
    );

    // Send verification email with code
    await sendArticleVerificationCodeEmail(
      data.authorEmail,
      data.authorName,
      code!
    );

    return {
      message: 'Verification email sent. Please check your inbox.',
      expiresAt,
      requiresVerification: true,
    };
  }

  // Step 1.5: Confirm article submission after email verification
  async confirmArticleSubmission(token: string) {
    // Verify token
    const verification = await VerificationService.verifyToken(token);

    if (!verification.valid) {
      throw new BadRequestError(verification.error || 'Invalid verification token');
    }

    const metadata = verification.data as unknown as ArticleVerificationMetadata;

    // Move file from temp to permanent directory
    let permanentFileUrl = metadata.pdfUrl;
    if (metadata.tempPdfPath && metadata.tempPdfPath.includes('/temp/')) {
      try {
        permanentFileUrl = await VerificationService.moveTempFile(metadata.tempPdfPath);
      } catch (error) {
        console.error('Failed to move temp file:', error);
        // Continue with temp path if move fails
      }
    }

    // Detect file type and convert to both formats
    const fileType = getFileType(permanentFileUrl);
    console.log(`📄 [Guest Verification] Converting file to both formats: ${permanentFileUrl}`);
    const { pdfPath, wordPath } = await ensureBothFormats(permanentFileUrl);

    // Create article first to get ID
    const article = await prisma.article.create({
      data: {
        authorName: metadata.authorName,
        authorEmail: metadata.authorEmail,
        ...(metadata.authorPhone && { authorPhone: metadata.authorPhone }),
        ...(metadata.authorOrganization && { authorOrganization: metadata.authorOrganization }),
        ...(metadata.secondAuthorName && { secondAuthorName: metadata.secondAuthorName }),
        ...(metadata.secondAuthorEmail && { secondAuthorEmail: metadata.secondAuthorEmail }),
        ...(metadata.secondAuthorPhone && { secondAuthorPhone: metadata.secondAuthorPhone }),
        ...(metadata.secondAuthorOrganization && { secondAuthorOrganization: metadata.secondAuthorOrganization }),
        title: metadata.title,
        category: metadata.category,
        abstract: metadata.abstract,
        ...(metadata.keywords && { keywords: metadata.keywords }),
        ...(metadata.coAuthors && { coAuthors: metadata.coAuthors }),
        ...(metadata.remarksToEditor && { remarksToEditor: metadata.remarksToEditor }),
        originalPdfUrl: pdfPath,
        currentPdfUrl: pdfPath,
        originalWordUrl: wordPath,
        currentWordUrl: wordPath,
        originalFileType: fileType,
        thumbnailUrl: metadata.thumbnailUrl || null,
        status: "PENDING_ADMIN_REVIEW",
      },
    });

    // Extract text content and images from PDF
    let pdfContent = { text: "", html: "", images: [] as string[] };
    try {
      pdfContent = await extractPdfContent(pdfPath, article.id);
    } catch (error) {
      console.error("Failed to extract PDF content:", error);
      // Continue without content - PDF will still be available for download
    }

    // Combine uploaded images with extracted images
    const allImageUrls = [
      ...(metadata.imageUrls || []),
      ...(pdfContent.images || [])
    ];

    // Update article with extracted content and images
    const updatedArticle = await prisma.article.update({
      where: { id: article.id },
      data: {
        content: pdfContent.text || null,
        contentHtml: pdfContent.html || null,
        imageUrls: allImageUrls,
      },
    });

    // Mark verification as complete and delete record
    await VerificationService.markAsVerified(token);
    await VerificationService.deleteVerification(token);

    // Send confirmation email to primary author
    await sendArticleSubmissionConfirmation(
      metadata.authorEmail,
      metadata.authorName,
      metadata.title,
      updatedArticle.id
    );

    // Send notification email to second author if exists
    if (metadata.secondAuthorEmail && metadata.secondAuthorName) {
      await sendCoAuthorNotification(
        metadata.secondAuthorEmail,
        metadata.secondAuthorName,
        metadata.authorName,
        metadata.title,
        updatedArticle.id
      );
    }

    return updatedArticle;
  }

  // Verify article submission by code
  async verifyArticleByCode(email: string, code: string) {
    // Verify code
    const verification = await VerificationService.verifyCode(email, code);

    if (!verification.valid) {
      throw new BadRequestError(verification.error || 'Invalid verification code');
    }

    const metadata = verification.data as unknown as ArticleVerificationMetadata;

    // Move file from temp to permanent directory
    let permanentFileUrl = metadata.pdfUrl;
    if (metadata.tempPdfPath && metadata.tempPdfPath.includes('/temp/')) {
      try {
        permanentFileUrl = await VerificationService.moveTempFile(metadata.tempPdfPath);
      } catch (error) {
        console.error('Failed to move temp file:', error);
        // Continue with temp path if move fails
      }
    }

    // Detect file type and convert to both formats
    const fileType = getFileType(permanentFileUrl);
    console.log(`📄 [Code Verification] Converting file to both formats: ${permanentFileUrl}`);
    const { pdfPath, wordPath } = await ensureBothFormats(permanentFileUrl);

    // Create article
    const article = await prisma.article.create({
      data: {
        authorName: metadata.authorName,
        authorEmail: metadata.authorEmail,
        ...(metadata.authorPhone && { authorPhone: metadata.authorPhone }),
        ...(metadata.authorOrganization && { authorOrganization: metadata.authorOrganization }),
        ...(metadata.secondAuthorName && { secondAuthorName: metadata.secondAuthorName }),
        ...(metadata.secondAuthorEmail && { secondAuthorEmail: metadata.secondAuthorEmail }),
        ...(metadata.secondAuthorPhone && { secondAuthorPhone: metadata.secondAuthorPhone }),
        ...(metadata.secondAuthorOrganization && { secondAuthorOrganization: metadata.secondAuthorOrganization }),
        title: metadata.title,
        category: metadata.category,
        abstract: metadata.abstract,
        ...(metadata.keywords && { keywords: metadata.keywords }),
        ...(metadata.coAuthors && { coAuthors: metadata.coAuthors }),
        ...(metadata.remarksToEditor && { remarksToEditor: metadata.remarksToEditor }),
        originalPdfUrl: pdfPath,
        currentPdfUrl: pdfPath,
        originalWordUrl: wordPath,
        currentWordUrl: wordPath,
        originalFileType: fileType,
        thumbnailUrl: metadata.thumbnailUrl || null,
        status: "PENDING_ADMIN_REVIEW",
      },
    });

    // Extract text content and images from PDF
    let pdfContent = { text: "", html: "", images: [] as string[] };
    try {
      pdfContent = await extractPdfContent(pdfPath, article.id);
    } catch (error) {
      console.error("Failed to extract PDF content:", error);
    }

    // Combine uploaded images with extracted images
    const allImageUrls = [
      ...(metadata.imageUrls || []),
      ...(pdfContent.images || [])
    ];

    // Update article with extracted content and images
    const updatedArticle = await prisma.article.update({
      where: { id: article.id },
      data: {
        content: pdfContent.text || null,
        contentHtml: pdfContent.html || null,
        imageUrls: allImageUrls,
      },
    });

    // Mark verification as complete and delete record
    await VerificationService.markAsVerifiedByCode(email, code);
    await VerificationService.deleteVerificationByCode(email, code);

    // Send confirmation email to primary author
    await sendArticleSubmissionConfirmation(
      metadata.authorEmail,
      metadata.authorName,
      metadata.title,
      updatedArticle.id
    );

    // Send notification email to second author if exists
    if (metadata.secondAuthorEmail && metadata.secondAuthorName) {
      await sendCoAuthorNotification(
        metadata.secondAuthorEmail,
        metadata.secondAuthorName,
        metadata.authorName,
        metadata.title,
        updatedArticle.id
      );
    }

    return {
      success: true,
      message: 'Article verified and submitted successfully',
      articleId: updatedArticle.id
    };
  }

  // Resend verification code
  async resendVerificationCode(email: string) {
    // Find existing verification record
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        isVerified: false,
        ttl: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!verification) {
      throw new BadRequestError('No pending verification found for this email');
    }

    if (!verification.verificationCode) {
      throw new BadRequestError('This verification does not support code resend');
    }

    const metadata = verification.metadata as any;

    // Send verification email with existing code
    await sendArticleVerificationCodeEmail(
      email,
      metadata.authorName,
      verification.verificationCode
    );

    return {
      success: true,
      message: 'Verification code resent successfully'
    };
  }

  // Step 2: Admin assigns editor
  async assignEditor(articleId: string, data: AssignEditorData, adminId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    if (article.status !== "PENDING_ADMIN_REVIEW") {
      throw new BadRequestError("Article is not in pending admin review status");
    }

    const editor = await prisma.user.findUnique({
      where: { id: data.editorId },
    });

    if (!editor) {
      throw new NotFoundError("Editor not found");
    }

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        assignedEditorId: data.editorId,
        status: "ASSIGNED_TO_EDITOR",
      },
      include: {
        assignedEditor: true,
      },
    });

    // Send emails
    sendEditorAssignmentNotification(
      editor.email,
      editor.name,
      article.title,
      article.authorName,
      article.category,
      article.id
    );

    // Send notification to primary author
    sendAuthorAssignmentNotification(
      article.authorEmail,
      article.authorName,
      article.title,
      article.id
    );

    // Send notification to second author if exists
    if (article.secondAuthorEmail && article.secondAuthorName) {
      sendAuthorAssignmentNotification(
        article.secondAuthorEmail,
        article.secondAuthorName,
        article.title,
        article.id
      );
    }

    return updatedArticle;
  }

  // Step 3 - Option A: Editor or Admin approves directly
 // Step 3 - Option A: Editor or Admin approves directly
  // ✅ CHANGE: Added 'newPdfUrl' parameter
  async approveArticle(articleId: string, userId: string, userRoles: string[], newPdfUrl?: string) {
    
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    // Check if user has permission to approve
    const isAdmin = userRoles.includes("admin");
    const isAssignedEditor = article.assignedEditorId === userId;

    if (!isAdmin && !isAssignedEditor) {
      throw new ForbiddenError("You do not have permission to approve this article");
    }

    // Admin can approve from any status, Editor only from specific statuses
    if (!isAdmin) {
      if (
        article.status !== "ASSIGNED_TO_EDITOR" &&
        article.status !== "PENDING_APPROVAL"
      ) {
        throw new BadRequestError("Article cannot be approved in current status");
      }
    } else {
      // Admin can approve from PENDING_ADMIN_REVIEW, ASSIGNED_TO_EDITOR, or PENDING_APPROVAL
      if (
        article.status !== "PENDING_ADMIN_REVIEW" &&
        article.status !== "ASSIGNED_TO_EDITOR" &&
        article.status !== "PENDING_APPROVAL"
      ) {
        throw new BadRequestError("Article cannot be approved in current status");
      }
    }

    // ✅ CHANGE: Dynamic update object
    const updateData: any = {
      status: "PUBLISHED",
      approvedAt: new Date(),
      reviewedAt: new Date(),
    };

    // ✅ CHANGE: Logic to replace PDF if new file is provided
    if (newPdfUrl) {
      console.log(`♻️ Replacing PDF for article ${articleId} on approval`);
      updateData.currentPdfUrl = newPdfUrl;
      
      // Optional: Extract text from new PDF for search indexing
      try {
        const pdfContent = await extractPdfContent(newPdfUrl);
        if (pdfContent.text) {
          updateData.content = pdfContent.text;
          updateData.contentHtml = pdfContent.html;
        }
      } catch (e) {
        console.error("Failed to extract content from new approval PDF", e);
      }
    }

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: updateData, // ✅ Using dynamic data
    });

    // Send approval email to primary author
    sendArticleApprovalNotification(
      article.authorEmail,
      article.authorName,
      article.title,
      article.id
    );

    // Send approval email to second author if exists
    if (article.secondAuthorEmail && article.secondAuthorName) {
      sendArticleApprovalNotification(
        article.secondAuthorEmail,
        article.secondAuthorName,
        article.title,
        article.id
      );
    }

    return updatedArticle;
  }

  // Step 3 - Editor uploads corrected PDF
  async uploadCorrectedPdf(
    articleId: string,
    editorId: string,
    data: UploadCorrectedPdfData
  ) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    if (article.assignedEditorId !== editorId) {
      throw new ForbiddenError("You are not assigned to this article");
    }

    if (article.status !== "ASSIGNED_TO_EDITOR" && article.status !== "EDITOR_EDITING") {
      throw new BadRequestError("Article is not in correct status for corrections");
    }

    // Convert to ensure both formats exist
    const fileType = getFileType(data.pdfUrl);
    console.log(`📄 [Editor Upload] Converting file to both formats: ${data.pdfUrl}`);
    const { pdfPath, wordPath } = await ensureBothFormats(data.pdfUrl);

    // ✅ NEW: Calculate diff between old and new file
    const oldFilePath = article.currentPdfUrl;
    const newFilePath = pdfPath;
    
    console.log(`📊 [Diff] Calculating changes...`);
    const diff = await calculateFileDiff(oldFilePath, newFilePath);
    const diffSummary = generateDiffSummary(diff);
    
    console.log(`✅ [Diff] ${diffSummary}`);

    // Get current version number
    const lastChangeLog = await prisma.articleChangeLog.findFirst({
      where: { articleId },
      orderBy: { versionNumber: "desc" },
    });
    const versionNumber = (lastChangeLog?.versionNumber || 1) + 1;

    // ✅ NEW: Create change log entry
    await prisma.articleChangeLog.create({
      data: {
        articleId: article.id,
        versionNumber,
        oldFileUrl: oldFilePath,
        newFileUrl: newFilePath,
        fileType: getFileTypeFromPath(newFilePath),
        diffData: diff as any, // Store full diff data
        editedBy: editorId,
        status: "pending",
        ...(data.comments && { comments: data.comments }),
      },
    });

    console.log(`📝 [Change Log] Created version ${versionNumber} for article ${articleId}`);

    // Extract text and images from corrected PDF
    let pdfContent = { text: "", html: "", images: [] as string[] };
    try {
      pdfContent = await extractPdfContent(pdfPath, articleId);
    } catch (error) {
      console.error("Failed to extract PDF content:", error);
      // Continue without content - PDF will still be available for download
    }

    // Create revision record (keep existing functionality)
    await prisma.articleRevision.create({
      data: {
        articleId: article.id,
        pdfUrl: pdfPath,
        wordUrl: wordPath,
        uploadedBy: editorId,
        ...(data.comments && { comments: data.comments }),
      },
    });

    // Update article with corrected PDF/Word, extracted text, and images
    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        currentPdfUrl: pdfPath,
        currentWordUrl: wordPath,
        content: pdfContent.text || null,
        contentHtml: pdfContent.html || null,
        imageUrls: pdfContent.images || [],
        status: "EDITOR_EDITING", // Changed from PENDING_APPROVAL
        reviewedAt: new Date(),
      },
    });

    // ✅ REMOVED: Don't send correction emails during editing
    // Author will receive ONE final email when article is published
    // with link to view complete change history (final diff only)
    
    console.log(`📝 [Editor Upload] Version ${versionNumber} uploaded. No email sent to author.`);
    console.log(`📊 [Diff Summary] ${diffSummary}`);

    return {
      article: updatedArticle,
      diffSummary,
      versionNumber,
    };
  }

  // List articles with filters (Admin/Editor)
  async listArticles(filters: ArticleListFilters) {
    const { status, category, authorEmail, assignedEditorId, page = 1, limit = 20 } = filters;

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (authorEmail) where.authorEmail = authorEmail;
    if (assignedEditorId) where.assignedEditorId = assignedEditorId;

    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: limit,
        include: {
          assignedEditor: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.article.count({ where }),
    ]);

    return {
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get single article details (full access - for logged-in users)
  async getArticleById(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { 
        id: articleId,
        status: "PUBLISHED"  // Only show published articles
      },
      include: {
        assignedEditor: {
          select: { id: true, name: true, email: true },
        },
        revisions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found or not published");
    }

    return article;
  }

  // Get article preview (limited access - for non-logged-in users)
  async getArticlePreview(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { 
        id: articleId, 
        status: "PUBLISHED" // Only show published articles
      },
      select: {
        id: true,
        title: true,
        category: true,
        abstract: true,
        authorName: true,
        authorOrganization: true,
        keywords: true,
        submittedAt: true,
        // NO PDF URLs - this is the key difference
        // NO revisions
        // NO assigned editor
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found or not published");
    }

    return article;
  }

  // Get PDF URL for download (for logged-in users)
  async getArticlePdfUrl(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { 
        id: articleId, 
        status: "PUBLISHED" 
      },
      select: { 
        currentPdfUrl: true,
        title: true 
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found or not published");
    }

    return article;
  }

  // Get Word URL for download (for all logged-in users)
  async getArticleWordUrl(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { 
        id: articleId, 
        status: "PUBLISHED" 
      },
      select: { 
        currentWordUrl: true,
        title: true 
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found or not published");
    }

    if (!article.currentWordUrl) {
      throw new NotFoundError("Word version not available for this article");
    }

    return article;
  }

  // Delete article (Admin only)
  async deleteArticle(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    await prisma.article.delete({
      where: { id: articleId },
    });

    return { message: "Article deleted successfully" };
  }

  // Get article content for reading (public endpoint with optional auth)
async getArticleContent(articleId: string, isAuthenticated: boolean = false) {
  const article = await prisma.article.findUnique({
    where: {
      id: articleId,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      title: true,
      abstract: true,
      category: true,
      keywords: true,
      authorName: true,
      authorOrganization: true,
      content: true,
      contentHtml: true,
      currentPdfUrl: true,
      currentWordUrl: true,
      thumbnailUrl: true,
      imageUrls: true,
      submittedAt: true,
      approvedAt: true,
    },
  });

  if (!article) {
    throw new NotFoundError("Article not found or not published");
  }

  // ✅ Lazy extraction - extract content on-demand if missing
  if (!article.content || article.content.trim().length === 0) {
    console.log(`⚡ [Lazy Extract] Content missing for article ${articleId}, extracting now...`);
    
    try {
      const pdfContent = await extractPdfContent(article.currentPdfUrl, articleId);
      
      if (pdfContent.text && pdfContent.text.length > 0) {
        console.log(`✅ [Lazy Extract] Extracted ${pdfContent.text.length} characters and ${pdfContent.images.length} images`);
        
        // Update database with extracted content and images
        await prisma.article.update({
          where: { id: articleId },
          data: {
            content: pdfContent.text,
            contentHtml: pdfContent.html,
            imageUrls: pdfContent.images || [],
          },
        });
        
        // Update the article object to return
        article.content = pdfContent.text;
        article.contentHtml = pdfContent.html;
        article.imageUrls = pdfContent.images || [];
      } else {
        console.warn(`⚠️ [Lazy Extract] No text extracted (might be scanned PDF)`);
      }
    } catch (error) {
      console.error(`❌ [Lazy Extract] Failed:`, error);
      // Continue without content - frontend will show "Preview unavailable"
    }
  }

  // ✅ Limit content for non-authenticated users
  if (!isAuthenticated && article.content) {
    const words = article.content.split(/\s+/);
    const wordLimit = 250; // 250 words (between 200-300)
    
    if (words.length > wordLimit) {
      const limitedContent = words.slice(0, wordLimit).join(' ') + '...';
      
      console.log(`🔒 [Content Limit] Non-authenticated user - showing ${wordLimit}/${words.length} words`);
      
      return {
        ...article,
        content: limitedContent,
        contentHtml: null, // Don't send HTML for limited preview
        isLimited: true,
        totalWords: words.length,
        previewWords: wordLimit,
      };
    }
  }

  console.log(`✅ [Full Access] ${isAuthenticated ? 'Authenticated' : 'Guest'} user - full content available`);
  
  return {
    ...article,
    isLimited: false,
  };
}


  // Get article upload history (revisions)
  async getArticleHistory(articleId: string) {
    // Get article details
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        status: true,
        originalPdfUrl: true,
        currentPdfUrl: true,
        authorName: true,
        authorEmail: true,
        submittedAt: true,
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    // Get all revisions with editor info
    const revisions = await prisma.articleRevision.findMany({
      where: { articleId },
      include: {
        article: {
          select: {
            assignedEditor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Get editor info for each revision
    const revisionsWithEditor = await Promise.all(
      revisions.map(async (rev) => {
        let editorInfo = null;
        if (rev.uploadedBy) {
          const editor = await prisma.user.findUnique({
            where: { id: rev.uploadedBy },
            select: {
              id: true,
              name: true,
              email: true,
            },
          });
          editorInfo = editor;
        }
        return {
          ...rev,
          uploadedByUser: editorInfo,
        };
      })
    );

    // Build history array
    const history = [
      // Original submission (version 1)
      {
        version: 1,
        type: "original",
        uploadedBy: {
          name: article.authorName,
          email: article.authorEmail,
          role: "Author",
        },
        uploadedAt: article.submittedAt,
        pdfUrl: article.originalPdfUrl,
        comments: null,
        isCurrent: article.currentPdfUrl === article.originalPdfUrl,
      },
      // All revisions (version 2, 3, 4...)
      ...revisionsWithEditor.map((rev, index) => ({
        version: index + 2,
        type: "revision",
        uploadedBy: {
          id: rev.uploadedByUser?.id,
          name: rev.uploadedByUser?.name || "Unknown Editor",
          email: rev.uploadedByUser?.email,
          role: "Editor",
        },
        uploadedAt: rev.createdAt,
        pdfUrl: rev.pdfUrl,
        comments: rev.comments,
        isCurrent: article.currentPdfUrl === rev.pdfUrl,
      })),
    ];

    return {
      article: {
        id: article.id,
        title: article.title,
        status: article.status,
        currentPdfUrl: article.currentPdfUrl,
      },
      history,
      totalVersions: history.length,
    };
  }

  // Search articles using PostgreSQL Full-Text Search with enhanced filters
 // Search articles using PostgreSQL Full-Text Search with enhanced filters
  async searchArticles(
    searchQuery: string,
    filters: {
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
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const sortBy = filters.sortBy || 'relevance';
    const sortOrder = filters.sortOrder || 'desc';
    const minScore = filters.minScore || 0;

    // Build category filter
    const categoryFilter = filters.category
      ? Prisma.sql`AND category = ${filters.category}`
      : Prisma.empty;

    // Build author filter (case-insensitive partial match)
    const authorFilter = filters.author
      ? Prisma.sql`AND "authorName" ILIKE ${'%' + filters.author + '%'}`
      : Prisma.empty;

    // Build organization filter (case-insensitive partial match)
    const organizationFilter = filters.organization
      ? Prisma.sql`AND "authorOrganization" ILIKE ${'%' + filters.organization + '%'}`
      : Prisma.empty;

    // Build keyword filter (case-insensitive partial match)
    const keywordFilter = filters.keyword
      ? Prisma.sql`AND keywords ILIKE ${'%' + filters.keyword + '%'}`
      : Prisma.empty;

    // Build date range filter
    let dateFilter = Prisma.empty;
    if (filters.dateFrom && filters.dateTo) {
      dateFilter = Prisma.sql`AND "approvedAt" BETWEEN ${filters.dateFrom}::timestamp AND ${filters.dateTo}::timestamp`;
    } else if (filters.dateFrom) {
      dateFilter = Prisma.sql`AND "approvedAt" >= ${filters.dateFrom}::timestamp`;
    } else if (filters.dateTo) {
      dateFilter = Prisma.sql`AND "approvedAt" <= ${filters.dateTo}::timestamp`;
    }

    // Build exclude filter (exclude articles containing certain words)
    const excludeFilter = filters.exclude
      ? Prisma.sql`AND NOT (
          title ILIKE ${'%' + filters.exclude + '%'} OR
          abstract ILIKE ${'%' + filters.exclude + '%'} OR
          keywords ILIKE ${'%' + filters.exclude + '%'}
        )`
      : Prisma.empty;

    // Build minimum score filter
    const minScoreFilter = minScore > 0
      ? Prisma.sql`AND relevance >= ${minScore}`
      : Prisma.empty;

    // Build ORDER BY clause based on sortBy parameter
    let orderByClause;
    switch (sortBy) {
      case 'date':
        orderByClause = Prisma.sql`ORDER BY "approvedAt" ${Prisma.raw(sortOrder.toUpperCase())}`;
        break;
      case 'title':
        orderByClause = Prisma.sql`ORDER BY title ${Prisma.raw(sortOrder.toUpperCase())}`;
        break;
      case 'author':
        orderByClause = Prisma.sql`ORDER BY "authorName" ${Prisma.raw(sortOrder.toUpperCase())}`;
        break;
      case 'relevance':
      default:
        orderByClause = Prisma.sql`ORDER BY relevance ${Prisma.raw(sortOrder.toUpperCase())}, "approvedAt" DESC`;
        break;
    }

    // ✅ MAJOR UPDATE: Added "authorName" to the search vector below
    const searchResults = await prisma.$queryRaw<any[]>`
      SELECT 
        id, 
        title, 
        abstract, 
        category, 
        keywords, 
        "authorName", 
        "authorOrganization", 
        "submittedAt",
        "approvedAt",
        ts_rank(
          to_tsvector('english', 
            coalesce(title, '') || ' ' || 
            coalesce(abstract, '') || ' ' || 
            coalesce(keywords, '') || ' ' ||
            coalesce(category, '') || ' ' ||
            coalesce("authorName", '')  -- ✅ Added Author here
          ),
          plainto_tsquery('english', ${searchQuery})
        ) as relevance
      FROM "Article"
      WHERE status = 'PUBLISHED'
        AND to_tsvector('english', 
          coalesce(title, '') || ' ' || 
          coalesce(abstract, '') || ' ' || 
          coalesce(keywords, '') || ' ' ||
          coalesce(category, '') || ' ' ||
          coalesce("authorName", '') -- ✅ Added Author here too
        ) @@ plainto_tsquery('english', ${searchQuery})
        ${categoryFilter}
        ${authorFilter}
        ${organizationFilter}
        ${keywordFilter}
        ${dateFilter}
        ${excludeFilter}
        ${minScoreFilter}
      ${orderByClause}
      LIMIT ${limit}
      OFFSET ${skip}
    `;

    // Get total count for pagination (with same filters)
    const countResult = await prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) as total
      FROM "Article"
      WHERE status = 'PUBLISHED'
        AND to_tsvector('english', 
          coalesce(title, '') || ' ' || 
          coalesce(abstract, '') || ' ' || 
          coalesce(keywords, '') || ' ' ||
          coalesce(category, '') || ' ' ||
          coalesce("authorName", '') -- ✅ Added Author here too
        ) @@ plainto_tsquery('english', ${searchQuery})
        ${categoryFilter}
        ${authorFilter}
        ${organizationFilter}
        ${keywordFilter}
        ${dateFilter}
        ${excludeFilter}
        ${minScoreFilter}
    `;

    const total = Number(countResult[0]?.total || 0);

    return {
      results: searchResults,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      query: searchQuery,
      filters: {
        category: filters.category,
        author: filters.author,
        organization: filters.organization,
        keyword: filters.keyword,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        sortBy,
        sortOrder,
        minScore,
        exclude: filters.exclude,
      },
    };
  }

  // Upload thumbnail for existing article
  async uploadThumbnail(articleId: string, thumbnailUrl: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: { thumbnailUrl },
    });

    return updatedArticle;
  }

  // Upload multiple images for existing article
  async uploadImages(articleId: string, imageUrls: string[]) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });
    
    if (!article) {
      throw new NotFoundError("Article not found");
    }
    
    // Append new images to existing ones
    const updatedImageUrls = [...(article.imageUrls || []), ...imageUrls];
    
    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: { imageUrls: updatedImageUrls },
    });
    
    return updatedArticle;
  }

  // ✅ NEW: Editor approves article (submits for publishing)
  async editorApproveArticle(articleId: string, editorId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        assignedEditor: true,
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    if (article.assignedEditorId !== editorId) {
      throw new ForbiddenError("You are not assigned to this article");
    }

    if (article.status !== "EDITOR_EDITING" && article.status !== "ASSIGNED_TO_EDITOR") {
      throw new BadRequestError("Article cannot be approved in current status");
    }

    // Update article status to EDITOR_APPROVED
    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        status: "EDITOR_APPROVED",
        editorApprovedAt: new Date(),
        reviewedAt: new Date(),
      },
    });

    // Update all change logs to "approved" status
    await prisma.articleChangeLog.updateMany({
      where: {
        articleId,
        status: "pending",
      },
      data: {
        status: "approved",
      },
    });

    // ✅ Notify all admins
    await notifyAdminOfEditorApproval(
      articleId,
      article.title,
      article.assignedEditor?.name || "Editor"
    );

    console.log(`✅ [Editor Approval] Article ${articleId} approved by editor ${editorId}`);

    return updatedArticle;
  }

  // ✅ NEW: Admin publishes article (only after editor approval)
  async adminPublishArticle(articleId: string, adminId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        assignedEditor: true,
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    // ✅ Check if editor has approved
    if (article.status !== "EDITOR_APPROVED") {
      throw new BadRequestError(
        "Article must be approved by editor before publishing. Current status: " + article.status
      );
    }

    // ✅ Calculate FINAL diff (original vs current) for author notification
    let finalDiffSummary = "No changes made";
    let finalDiffData = null;
    
    if (article.originalPdfUrl !== article.currentPdfUrl) {
      try {
        console.log(`📊 [Final Diff] Calculating original vs final for author...`);
        console.log(`   Original: ${article.originalPdfUrl}`);
        console.log(`   Final: ${article.currentPdfUrl}`);
        
        const finalDiff = await calculateFileDiff(
          article.originalPdfUrl,  // Original submission
          article.currentPdfUrl    // Final published version
        );
        
        finalDiffData = finalDiff;
        finalDiffSummary = generateDiffSummary(finalDiff);
        
        console.log(`✅ [Final Diff] ${finalDiffSummary}`);
      } catch (error) {
        console.error("❌ [Final Diff] Failed to calculate:", error);
        // Continue with generic message if diff calculation fails
        finalDiffSummary = "Changes were made during review";
      }
    } else {
      console.log(`ℹ️ [Final Diff] No changes - original and current are the same`);
    }

    // Update article status to PUBLISHED
    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        status: "PUBLISHED",
        approvedAt: new Date(),
      },
    });

    // Update all change logs to "published" status
    await prisma.articleChangeLog.updateMany({
      where: {
        articleId,
        status: "approved",
      },
      data: {
        status: "published",
      },
    });

    // ✅ Notify original uploader with FINAL diff summary
    await notifyUploaderOfPublication(
      articleId,
      article.title,
      article.authorEmail,
      article.authorName,
      finalDiffSummary  // Pass final diff summary
    );

    // ✅ Notify second author if exists
    if (article.secondAuthorEmail && article.secondAuthorName) {
      await notifyUploaderOfPublication(
        articleId,
        article.title,
        article.secondAuthorEmail,
        article.secondAuthorName,
        finalDiffSummary  // Pass final diff summary
      );
    }

    console.log(`✅ [Admin Publish] Article ${articleId} published by admin ${adminId}`);

    return {
      article: updatedArticle,
      diffSummary: finalDiffSummary,
    };
  }

  // ✅ NEW: Get change history for an article
  async getArticleChangeHistory(articleId: string, userId: string, userRoles: string[]) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        status: true,
        assignedEditorId: true,
        authorEmail: true,
        secondAuthorEmail: true,
        originalPdfUrl: true,
        currentPdfUrl: true,
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    const isAdmin = userRoles.includes("admin");
    const isAssignedEditor = article.assignedEditorId === userId;

    // Check if user is the uploader
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const isUploader = user && (user.email === article.authorEmail || user.email === article.secondAuthorEmail);

    // Access control
    if (!isAdmin && !isAssignedEditor && !isUploader) {
      throw new ForbiddenError("You do not have permission to view this article's change history");
    }

    // If uploader and article not published, deny access
    if (isUploader && !isAdmin && !isAssignedEditor && article.status !== "PUBLISHED") {
      throw new ForbiddenError("Change history is only available after article is published");
    }

    // Get all change logs
    const changeLogs = await prisma.articleChangeLog.findMany({
      where: { articleId },
      orderBy: { versionNumber: "asc" },
      include: {
        editor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If uploader (non-admin, non-editor), calculate and show FINAL diff only
    if (isUploader && !isAdmin && !isAssignedEditor) {
      try {
        console.log(`📊 [Author View] Calculating final diff (original vs current)...`);
        
        // Calculate actual diff between original and current
        const finalDiff = await calculateFileDiff(
          article.originalPdfUrl,
          article.currentPdfUrl
        );
        
        const finalDiffSummary = generateDiffSummary(finalDiff);
        console.log(`✅ [Author View] ${finalDiffSummary}`);

        return {
          article: {
            id: article.id,
            title: article.title,
            status: article.status,
            originalPdfUrl: article.originalPdfUrl,
            currentPdfUrl: article.currentPdfUrl,
          },
          finalDiff: {
            totalAdded: finalDiff.summary.totalAdded,
            totalRemoved: finalDiff.summary.totalRemoved,
            totalModified: finalDiff.summary.totalModified,
            summary: finalDiffSummary,
            diffData: finalDiff,  // Include full diff data for detailed view
          },
          accessLevel: "uploader",
        };
      } catch (error) {
        console.error("❌ [Author View] Failed to calculate final diff:", error);
        
        // Fallback: return summary without detailed diff
        return {
          article: {
            id: article.id,
            title: article.title,
            status: article.status,
            originalPdfUrl: article.originalPdfUrl,
            currentPdfUrl: article.currentPdfUrl,
          },
          finalDiff: {
            totalAdded: 0,
            totalRemoved: 0,
            totalModified: 0,
            summary: "Changes were made during review",
          },
          accessLevel: "uploader",
        };
      }
    }

    // Admin or assigned editor - show full history
    return {
      article: {
        id: article.id,
        title: article.title,
        status: article.status,
        originalPdfUrl: article.originalPdfUrl,
        currentPdfUrl: article.currentPdfUrl,
      },
      changeLogs: changeLogs.map((log) => ({
        id: log.id,
        versionNumber: log.versionNumber,
        fileType: log.fileType,
        editedBy: log.editor,
        editedAt: log.editedAt,
        status: log.status,
        comments: log.comments,
        diffSummary: generateDiffSummary(log.diffData as any),
        diffData: log.diffData, // Full diff data
      })),
      totalVersions: changeLogs.length + 1, // +1 for original
      accessLevel: isAdmin ? "admin" : "editor",
    };
  }

  // ✅ NEW: Get specific diff details
  async getChangeLogDiff(changeLogId: string, userId: string, userRoles: string[]) {
    const changeLog = await prisma.articleChangeLog.findUnique({
      where: { id: changeLogId },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            assignedEditorId: true,
            authorEmail: true,
            secondAuthorEmail: true,
          },
        },
        editor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!changeLog) {
      throw new NotFoundError("Change log not found");
    }

    const isAdmin = userRoles.includes("admin");
    const isAssignedEditor = changeLog.article.assignedEditorId === userId;

    // Check if user is the uploader
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const isUploader = user && (
      user.email === changeLog.article.authorEmail || 
      user.email === changeLog.article.secondAuthorEmail
    );

    // Access control
    if (!isAdmin && !isAssignedEditor && !isUploader) {
      throw new ForbiddenError("You do not have permission to view this change log");
    }

    return {
      id: changeLog.id,
      articleId: changeLog.articleId,
      articleTitle: changeLog.article.title,
      versionNumber: changeLog.versionNumber,
      fileType: changeLog.fileType,
      oldFileUrl: changeLog.oldFileUrl,
      newFileUrl: changeLog.newFileUrl,
      diffData: changeLog.diffData,
      editedBy: changeLog.editor,
      editedAt: changeLog.editedAt,
      status: changeLog.status,
      comments: changeLog.comments,
    };
  }
}

export const articleService = new ArticleService();