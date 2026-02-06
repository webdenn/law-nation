import { prisma } from "@/db/db.js";
import path from "path";
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  InternalServerError,
} from "@/utils/http-errors.util.js";
import { resolveToAbsolutePath, fileExistsAtPath } from "@/utils/file-path.utils.js";
import { extractPdfContent } from "@/utils/pdf-extract.utils.js";
import {
  ensureBothFormats,
  getFileType,
} from "@/utils/file-conversion.utils.js";
import {
  calculateFileDiff,
  // generateDiffSummary, // COMMENTED: Frontend handles diff calculation
  getFileTypeFromPath,
} from "@/utils/diff-calculator.utils.js";
import {
  notifyAdminOfEditorApproval,
  notifyUploaderOfPublication,
} from "@/utils/notification.utils.js";
import {
  sendEditorAssignmentNotification,
  sendAuthorAssignmentNotification,
  sendArticleApprovalNotification,
  sendEditorReassignmentNotification,
} from "@/utils/email.utils.js";
import { articleHistoryService } from "../article-history.service.js";
import { adobeService } from "@/services/adobe.service.js";
import type {
  AssignEditorData,
  UploadCorrectedPdfData,
} from "../types/article-submission.type.js";

//Article Workflow Service Handles editor assignment, corrections, approvals, and publishing

export class ArticleWorkflowService {
  //Admin assigns editor (handles both first-time assignment and reassignment)

  async assignEditor(
    articleId: string,
    data: AssignEditorData,
    adminId: string
  ) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { assignedEditor: true },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    const allowedStatuses = [
      "PENDING_ADMIN_REVIEW",
      "ASSIGNED_TO_EDITOR",
      "EDITOR_EDITING",
    ];
    if (!allowedStatuses.includes(article.status)) {
      throw new BadRequestError(
        `Cannot assign/reassign editor in current status: ${article.status}`
      );
    }

    if (article.assignedEditorId === data.editorId) {
      throw new BadRequestError("Article is already assigned to this editor");
    }

    const newEditor = await prisma.user.findUnique({
      where: { id: data.editorId },
    });
    if (!newEditor) {
      throw new NotFoundError("Editor not found");
    }

    const isReassignment = !!article.assignedEditorId;
    const oldEditor = article.assignedEditor;

    console.log(
      isReassignment
        ? `🔄 [Reassignment] Article ${articleId}: ${oldEditor?.name} → ${newEditor.name}`
        : `✨ [First Assignment] Article ${articleId}: → ${newEditor.name}`
    );

    if (isReassignment && oldEditor) {
      const preserveWork = data.preserveWork !== false;

      if (!preserveWork) {
        console.log(`🗑️ [Reassignment] Deleting previous editor's work`);
        await prisma.articleRevision.deleteMany({
          where: { articleId, uploadedBy: oldEditor.id },
        });
        await prisma.articleChangeLog.deleteMany({
          where: { articleId, editedBy: oldEditor.id },
        });
        console.log(`✅ [Reassignment] Previous editor's work deleted`);
      } else {
        console.log(`📦 [Reassignment] Preserving previous editor's work`);
      }
    }

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        assignedEditorId: data.editorId,
        assignedReviewerId: null, // ✅ Clear reviewer assignment to ensure exclusive ownership
        status: "ASSIGNED_TO_EDITOR",
      },
      include: { assignedEditor: true },
    });

    if (isReassignment && oldEditor) {
      await articleHistoryService.logReassignment({
        articleId,
        oldEditorId: oldEditor.id,
        newEditorId: data.editorId,
        assignedBy: adminId,
        ...(data.reason && { reason: data.reason }),
      });
    } else {
      await articleHistoryService.logAssignment({
        articleId,
        editorId: data.editorId,
        assignedBy: adminId,
        ...(data.reason && { reason: data.reason }),
      });
    }

    if (isReassignment && oldEditor) {
      sendEditorReassignmentNotification(
        oldEditor.email,
        oldEditor.name,
        article.title,
        article.id
      );
      sendEditorAssignmentNotification(
        newEditor.email,
        newEditor.name,
        article.title,
        article.authorName,
        article.category,
        article.id
      );
      console.log(`ℹ️ [Reassignment] Author not notified (as per policy)`);
    } else {
      sendEditorAssignmentNotification(
        newEditor.email,
        newEditor.name,
        article.title,
        article.authorName,
        article.category,
        article.id
      );
      sendAuthorAssignmentNotification(
        article.authorEmail,
        article.authorName,
        article.title,
        article.id
      );
      if (article.secondAuthorEmail && article.secondAuthorName) {
        sendAuthorAssignmentNotification(
          article.secondAuthorEmail,
          article.secondAuthorName,
          article.title,
          article.id
        );
      }
    }

    return {
      article: updatedArticle,
      isReassignment,
      oldEditor: isReassignment
        ? { id: oldEditor?.id, name: oldEditor?.name, email: oldEditor?.email }
        : null,
      newEditor: {
        id: newEditor.id,
        name: newEditor.name,
        email: newEditor.email,
      },
    };
  }

  // NEW: Improved editor upload workflow with clean processing and text extraction
  async uploadCorrectedDocxImproved(
    articleId: string,
    editorId: string,
    data: UploadCorrectedPdfData,
    userRoles: string[] = []
  ) {
    console.log(`🚀 [Improved Workflow] Starting improved editor upload for article ${articleId}`);

    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    const isAdmin = userRoles.includes("admin") || userRoles.includes("ADMIN");
    if (article.assignedEditorId !== editorId && !isAdmin) {
      throw new ForbiddenError("You are not assigned to this article");
    }

    // Validate uploaded file is DOCX
    if (!data.presignedUrl.toLowerCase().endsWith('.docx')) {
      throw new BadRequestError('Please upload a DOCX file');
    }

    try {
      // Step 1: Process clean DOCX (editor's upload)
      // If it's a URL, we don't resolve to absolute local path - Adobe service will handle either
      const isUrl = (path: string) => path.startsWith('http://') || path.startsWith('https://');
      const cleanDocxPath = isUrl(data.presignedUrl) ? data.presignedUrl : resolveToAbsolutePath(data.presignedUrl);
      console.log(`📄 [Clean Process] Processing clean DOCX: ${cleanDocxPath}`);

      if (!isUrl(data.presignedUrl) && !fileExistsAtPath(data.presignedUrl)) {
        throw new Error(`DOCX file not found: ${cleanDocxPath}`);
      }

      // Step 2: Convert clean DOCX to clean PDF using Adobe
      const cleanPdfPath = cleanDocxPath.replace(/\.docx$/i, '_clean.pdf');
      console.log(`🔄 [Adobe] Converting clean DOCX to clean PDF`);
      await adobeService.convertDocxToPdf(cleanDocxPath, cleanPdfPath);

      // Step 3: Validate the generated PDF before text extraction
      console.log(`🔍 [Validation] Validating generated PDF structure...`);
      // Note: PDF validation is now handled inside Adobe service extractTextFromPdf method

      // Step 4: Extract text from clean PDF using Adobe ExtractPDF (with validation and fallbacks)
      console.log(`🔍 [Adobe] Extracting text from clean PDF with validation and fallbacks`);
      let extractedText: string = await adobeService.extractTextFromPdf(cleanPdfPath);
      console.log(`✅ [Adobe] Extracted ${extractedText.length} characters from clean PDF`);

      // Check if extraction returned an error message about corruption
      if (extractedText.includes('PDF file is corrupted') || extractedText.includes('text cannot be extracted')) {
        console.warn(`⚠️ [Improved Workflow] PDF corruption detected during text extraction, trying Mammoth fallback...`);

        try {
          const mammothText = await adobeService.extractTextFromDocxUsingMammoth(cleanDocxPath);
          if (mammothText && mammothText.length > 0) {
            extractedText = mammothText;
            console.log(`✅ [Fallback] Extracted ${extractedText.length} characters using Mammoth`);
          }
        } catch (mammothError: any) {
          console.error(`❌ [Fallback] Mammoth extraction also failed:`, mammothError.message);
        }
      }

      // Step 5: Create watermarked versions
      const watermarkData = {
        userName: 'LAW NATION EDITOR',
        downloadDate: new Date(),
        articleTitle: article.title,
        articleId: article.id,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      };

      // Create watermarked DOCX (header/footer style)
      const watermarkedDocxPath = cleanDocxPath.replace(/\.docx$/i, '_watermarked.docx');
      console.log(`💧 [Watermark] Adding DOCX-style watermark (header/footer)`);
      await adobeService.addWatermarkToDocx(cleanDocxPath, watermarkedDocxPath, watermarkData);

      // Create watermarked PDF (overlay/background style) - Apply to clean PDF directly
      const watermarkedPdfPath = cleanPdfPath.replace(/\.pdf$/i, '_watermarked.pdf');
      console.log(`💧 [Watermark] Adding PDF-style watermark (overlay/background)`);
      await adobeService.addWatermarkToPdf(cleanPdfPath, watermarkedPdfPath, watermarkData);

      // Step 6: Convert paths to relative for database storage
      const { convertToWebPath } = await import('@/utils/file-path.utils.js');
      const relativeCleanPdf = convertToWebPath(cleanPdfPath);
      const relativeWatermarkedDocx = convertToWebPath(watermarkedDocxPath);
      const relativeWatermarkedPdf = convertToWebPath(watermarkedPdfPath);

      // Step 7: Update article with extracted text and file paths
      const updatedArticle = await prisma.article.update({
        where: { id: articleId },
        data: {
          // Store extracted text for user display
          content: extractedText,
          contentHtml: extractedText.replace(/\n/g, '<br>'),

          // Store file paths
          currentPdfUrl: relativeWatermarkedPdf, // Watermarked PDF for downloads
          currentWordUrl: relativeWatermarkedDocx, // Watermarked DOCX for downloads

          // Update status - KEEP as EDITOR_EDITING so editor must explicitly approve
          status: "EDITOR_EDITING",
        },
      });

      // Step 7.5: Calculate Diff
      console.log(`📊 [Diff] Calculating changes for Improved Workflow...`);
      const diff = await calculateFileDiff(article.currentPdfUrl, cleanPdfPath);
      console.log(`✅ [Diff] Calculation complete`);

      // Step 8: Create change log
      await prisma.articleChangeLog.create({
        data: {
          articleId: article.id,
          versionNumber: await this.getNextVersionNumber(articleId),
          oldFileUrl: article.currentWordUrl || "",
          newFileUrl: relativeWatermarkedDocx,
          fileType: "DOCX",
          diffData: {
            ...diff,
            type: "improved_workflow",
            message: "Clean processing with Adobe text extraction and validation",
            extractedTextLength: extractedText.length,
            hasCorruption: extractedText.includes('PDF file is corrupted')
          } as any,
          editedBy: editorId,
          status: "approved",
          comments: data.comments || "Processed with improved workflow: clean DOCX → clean PDF → validated text extraction → watermarking",
        },
      });

      console.log(`✅ [Improved Workflow] Article ${articleId} processed successfully`);
      console.log(`   📊 Extracted text: ${extractedText.length} characters`);
      console.log(`   📄 Clean PDF: ${relativeCleanPdf}`);
      console.log(`   💧 Watermarked DOCX: ${relativeWatermarkedDocx}`);
      console.log(`   💧 Watermarked PDF: ${relativeWatermarkedPdf}`);

      return {
        message: "Article processed successfully with improved workflow and validation",
        article: updatedArticle,
        extractedTextLength: extractedText.length,
        hasCorruption: extractedText.includes('PDF file is corrupted'),
        files: {
          cleanPdf: relativeCleanPdf,
          watermarkedDocx: relativeWatermarkedDocx,
          watermarkedPdf: relativeWatermarkedPdf,
        }
      };

    } catch (error: any) {
      console.error(`❌ [Improved Workflow] Failed to process article ${articleId}:`, error);
      throw new InternalServerError(`Failed to process article: ${error.message}`);
    }
  }

  // Helper method to get next version number
  private async getNextVersionNumber(articleId: string): Promise<number> {
    const lastLog = await prisma.articleChangeLog.findFirst({
      where: { articleId },
      orderBy: { versionNumber: 'desc' },
    });
    return (lastLog?.versionNumber || 0) + 1;
  }

  // Helper method to extract text for publishing with proper fallbacks and retries
  private async extractTextForPublishing(article: any): Promise<string> {
    const fs = await import('fs');
    const path = await import('path');

    try {
      // Try to find the clean PDF (before watermarking) for text extraction
      let cleanPdfUrl = article.currentPdfUrl;

      // If the current PDF is watermarked, try to find the clean version
      if (cleanPdfUrl && cleanPdfUrl.includes('_watermarked.pdf')) {
        const cleanVersion = cleanPdfUrl.replace('_watermarked.pdf', '.pdf');
        console.log(`🔍 [Text Extract] Looking for clean PDF: ${cleanVersion}`);

        // Check if clean version exists
        const cleanPath = path.join(process.cwd(), cleanVersion.startsWith('/') ? cleanVersion.substring(1) : cleanVersion);
        if (fs.existsSync(cleanPath)) {
          cleanPdfUrl = cleanVersion;
          console.log(`✅ [Text Extract] Found clean PDF for extraction: ${cleanPdfUrl}`);
        } else {
          console.log(`⚠️ [Text Extract] Clean PDF not found, will try watermarked version`);
        }
      }

      // Try Adobe extraction with enhanced error handling (includes validation, repair, and fallbacks)
      if (cleanPdfUrl) {
        console.log(`🔍 [Text Extract] Attempting Adobe PDF extraction with validation and repair...`);

        try {
          const extractedText = await adobeService.extractTextFromPdf(cleanPdfUrl);

          if (extractedText && extractedText.length > 0) {
            // Check if the extracted text indicates corruption
            if (extractedText.includes('PDF file is corrupted') || extractedText.includes('text cannot be extracted')) {
              console.warn(`⚠️ [Text Extract] Adobe detected corrupted PDF, trying Mammoth fallback...`);

              if (article.currentWordUrl) {
                try {
                  const mammothText = await adobeService.extractTextFromDocxUsingMammoth(article.currentWordUrl);
                  if (mammothText && mammothText.length > 0) {
                    console.log(`✅ [Text Extract] Mammoth fallback successful (${mammothText.length} characters)`);
                    return mammothText;
                  }
                } catch (fallbackError) {
                  console.warn(`⚠️ [Text Extract] Mammoth fallback failed:`, fallbackError);
                }
              }

              return extractedText; // Return the error message if fallback failed
            }

            console.log(`✅ [Text Extract] Adobe extraction successful (${extractedText.length} characters)`);
            return extractedText;
          }
        } catch (error: any) {
          console.error(`❌ [Text Extract] Adobe extraction failed:`, error.message);

          // Check if this is a BAD_PDF error
          if (error.message && error.message.includes('BAD_PDF')) {
            console.warn(`⚠️ [Text Extract] BAD_PDF error - Adobe service already tried fallback methods`);
            // Adobe service already tried alternative methods, so we trust its result
            throw error;
          }
        }
      }
    } catch (error: any) {
      console.error('❌ [Text Extract] Adobe extraction completely failed:', error.message);

      // If Adobe service returned a user-friendly error message, use it
      if (error.message && error.message.includes('PDF file is corrupted')) {
        return error.message;
      }
    }

    // Fallback to existing content if available and not corrupted
    if (article.content && article.content.trim().length > 0) {
      // Check if existing content looks corrupted
      const hasCorruptedData = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]|PKx|��|AEstructuredData/.test(article.content);

      if (!hasCorruptedData) {
        console.log(`ℹ️ [Text Extract] Using existing clean content as fallback (${article.content.length} characters)`);
        return article.content;
      } else {
        console.warn(`⚠️ [Text Extract] Existing content appears corrupted, not using as fallback`);
      }
    }

    // Try Mammoth extraction from DOCX as last resort
    if (article.currentWordUrl) {
      try {
        console.log(`🔄 [Text Extract] Attempting Mammoth extraction from DOCX as last resort...`);
        const mammothText = await adobeService.extractTextFromDocxUsingMammoth(article.currentWordUrl);
        if (mammothText && mammothText.length > 0) {
          console.log(`✅ [Text Extract] Mammoth extraction successful (${mammothText.length} characters)`);
          return mammothText;
        }
      } catch (error: any) {
        console.warn(`⚠️ [Text Extract] Mammoth extraction failed:`, error.message);
      }
    }

    // Last resort: return meaningful error message
    console.warn('⚠️ [Text Extract] All extraction methods failed');
    return 'This document could not be processed due to file corruption. Please upload a new, uncorrupted version of the document for proper text extraction and display.';
  }

  //Editor uploads corrected PDF

  async uploadCorrectedPdf(
    articleId: string,
    editorId: string,
    data: UploadCorrectedPdfData,
    userRoles: string[] = []
  ) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    const isAdmin = userRoles.includes("admin") || userRoles.includes("ADMIN");

    if (article.assignedEditorId !== editorId && !isAdmin) {
      throw new ForbiddenError("You are not assigned to this article");
    }

    // Allow corrections in multiple statuses
    const validStatuses = [
      "ASSIGNED_TO_EDITOR",
      "EDITOR_EDITING",
      "EDITOR_APPROVED", // Allow re-editing
      "PENDING_ADMIN_REVIEW" // Allow editing before assignment
    ];

    // Allow admins to edit published articles AND reviewer approved articles
    if (!validStatuses.includes(article.status)) {
      if (isAdmin && (
        article.status === 'PUBLISHED' ||
        article.status.startsWith('REVIEWER_') ||
        article.status === 'ASSIGNED_TO_REVIEWER'
      )) {
        // Allowed for admin on published or reviewer statuses
      } else {
        throw new BadRequestError(
          `Article status '${article.status}' does not allow corrections. Valid statuses: ${validStatuses.join(', ')}`
        );
      }
    }

    // NEW: Use improved workflow for DOCX uploads
    if (data.presignedUrl.toLowerCase().endsWith('.docx')) {
      console.log(`🚀 [Upload] Using improved workflow for DOCX upload`);
      return await this.uploadCorrectedDocxImproved(articleId, editorId, data, userRoles);
    }

    // Existing logic for PDF uploads and other cases
    if (article.contentType === 'DOCUMENT') {
      return await this.handleDocumentEdit(article, editorId, data);
    } else {
      return await this.handleArticleEdit(article, editorId, data);
    }
  }

  // NEW: Handle document editing (DOCX files)
  private async handleDocumentEdit(article: any, editorId: string, data: UploadCorrectedPdfData) {
    console.log(`📄 [Document Edit] Processing DOCX upload for document ${article.id}`);

    // For documents, the uploaded file should be DOCX
    let docxPath = data.presignedUrl; // This is actually a DOCX file for documents

    // Fix path resolution - convert relative path to absolute if needed
    const isUrl = (path: string) => path.startsWith('http://') || path.startsWith('https://');

    if (!isUrl(docxPath) && docxPath.startsWith('/uploads/')) {
      docxPath = docxPath.replace('/uploads/', 'uploads/');
      docxPath = path.join(process.cwd(), docxPath);
      console.log(`📂 [Document Edit] Resolved absolute path: ${docxPath}`);
    }

    // Validate it's actually a DOCX file
    if (!docxPath.toLowerCase().endsWith('.docx')) {
      throw new Error('Document workflow requires DOCX files');
    }

    // Verify file exists (only for local files)
    const fs = await import('fs');
    if (!isUrl(docxPath) && !fs.existsSync(docxPath)) {
      throw new Error(`DOCX file not found: ${docxPath}`);
    }

    // Add watermark to edited DOCX
    const watermarkData = {
      userName: 'LAW NATION EDITOR',
      downloadDate: new Date(),
      articleTitle: article.title,
      articleId: article.id,
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    };

    // Generate local output paths
    // If input is a URL, we need a base local path for outputs
    let baseLocalPath: string;
    if (isUrl(docxPath)) {
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      baseLocalPath = path.join(tempDir, `doc-edit-${Date.now()}.docx`);
    } else {
      baseLocalPath = docxPath;
    }

    const watermarkedDocxPath = baseLocalPath.replace(/\.docx$/i, '_edited_watermarked.docx');
    await adobeService.addWatermarkToDocx(docxPath, watermarkedDocxPath, watermarkData);

    // Convert edited DOCX to PDF for preview using Adobe Services
    const pdfPath = baseLocalPath.replace(/\.docx$/i, '_edited.pdf');
    console.log(`🔄 [Adobe] Converting DOCX to PDF for preview: ${watermarkedDocxPath} → ${pdfPath}`);
    await adobeService.convertDocxToPdf(watermarkedDocxPath, pdfPath);

    // Convert absolute paths back to relative for database storage
    const relativePdfPath = pdfPath.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, '');
    const relativeDocxPath = watermarkedDocxPath.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, '');

    // Update article with edited versions
    const updatedArticle = await prisma.article.update({
      where: { id: article.id },
      data: {
        currentPdfUrl: `/${relativePdfPath}`,
        currentWordUrl: `/${relativeDocxPath}`,
        status: "EDITOR_EDITING",
      },
      include: { assignedEditor: true }, // Include editor info usually needed
    });

    // Create change log for document
    await prisma.articleChangeLog.create({
      data: {
        articleId: article.id,
        versionNumber: 2, // Simple versioning for documents
        oldFileUrl: article.currentPdfUrl,
        newFileUrl: `/${relativePdfPath}`,
        fileType: "DOCX",
        diffData: { type: "document_edit", message: "Document edited by editor using Adobe Services" } as any,
        editedBy: editorId,
        status: "approved",
        comments: data.comments || "Document edited with Adobe conversion",
      },
    });

    console.log(`✅ [Document Edit] Document ${article.id} processed successfully with Adobe Services`);

    return {
      message: "Document edited successfully using Adobe Services",
      article: updatedArticle,
    };
  }

  // Existing article editing logic - Enhanced to detect DOCX uploads
  private async handleArticleEdit(article: any, editorId: string, data: UploadCorrectedPdfData) {
    // Check if this is a DOCX upload - if so, treat as document workflow
    const isDocxUpload = data.presignedUrl.toLowerCase().endsWith('.docx');

    if (isDocxUpload) {
      console.log(`📄 [Article Edit] DOCX detected - switching to document workflow for ${article.id}`);

      // Update article to document type if not already
      if (article.contentType !== 'DOCUMENT') {
        await prisma.article.update({
          where: { id: article.id },
          data: {
            contentType: 'DOCUMENT',
            documentType: 'DOCX'
          }
        });
        article.contentType = 'DOCUMENT'; // Update local object
      }

      // Use document workflow with Adobe services
      return await this.handleDocumentEdit(article, editorId, data);
    }

    console.log(
      `📄 [Editor Upload] Converting file to both formats: ${data.presignedUrl}`
    );
    const { pdfPath, wordPath } = await ensureBothFormats(data.presignedUrl);

    const oldFilePath = article.currentPdfUrl;
    const newFilePath = pdfPath;

    console.log(`📊 [Diff] Calculating changes...`);
    const diff = await calculateFileDiff(oldFilePath, newFilePath);
    // const diffSummary = generateDiffSummary(diff); // COMMENTED: Frontend handles diff calculation
    const diffSummary = "Changes made - view in frontend diff viewer";
    console.log(`✅ [Diff] ${diffSummary}`);

    const lastChangeLog = await prisma.articleChangeLog.findFirst({
      where: { articleId: article.id },
      orderBy: { versionNumber: "desc" },
    });
    const versionNumber = (lastChangeLog?.versionNumber || 1) + 1;

    await prisma.articleChangeLog.create({
      data: {
        articleId: article.id,
        versionNumber,
        oldFileUrl: oldFilePath,
        newFileUrl: newFilePath,
        fileType: getFileTypeFromPath(newFilePath),
        diffData: diff as any,
        editedBy: editorId,
        status: "pending",
        ...(data.comments && { comments: data.comments }),
        ...(data.editorDocumentUrl && {
          editorDocumentUrl: data.editorDocumentUrl,
        }),
        ...(data.editorDocumentType && {
          editorDocumentType: data.editorDocumentType,
        }),
      },
    });

    console.log(
      `📝 [Change Log] Created version ${versionNumber} for article ${article.id}`
    );

    let pdfContent = { text: "", html: "", images: [] as string[] };
    try {
      // Extract text from the converted PDF using Adobe services
      const extractedText = await adobeService.extractTextFromPdf(pdfPath);

      // Still extract images from PDF
      const pdfImageContent = await extractPdfContent(pdfPath, article.id);

      pdfContent = {
        text: extractedText,
        html: extractedText.replace(/\n/g, '<br>'), // Simple HTML conversion
        images: pdfImageContent.images || []
      };

      console.log(`✅ [Adobe Extract] Extracted ${extractedText.length} characters from PDF`);
    } catch (error) {
      console.error("Failed to extract content using Adobe:", error);
      // Fallback to old method
      try {
        pdfContent = await extractPdfContent(pdfPath, article.id);
      } catch (fallbackError) {
        console.error("Fallback extraction also failed:", fallbackError);
      }
    }

    await prisma.articleRevision.create({
      data: {
        articleId: article.id,
        pdfUrl: pdfPath,
        wordUrl: wordPath,
        uploadedBy: editorId,
        ...(data.comments && { comments: data.comments }),
      },
    });

    const updatedArticle = await prisma.article.update({
      where: { id: article.id },
      data: {
        currentPdfUrl: pdfPath,
        currentWordUrl: wordPath,
        content: pdfContent.text || null,
        contentHtml: pdfContent.html || null,
        imageUrls: pdfContent.images || [],
        status: "EDITOR_EDITING",
        reviewedAt: new Date(),
      },
    });

    console.log(
      `📝 [Editor Upload] Version ${versionNumber} uploaded. No email sent to author.`
    );

    return {
      article: updatedArticle,
      diffSummary,
      versionNumber,
    };
  }

  //Editor approves article (NEW WORKFLOW: goes to reviewer if assigned, otherwise to admin)

  async editorApproveArticle(articleId: string, editorId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { assignedEditor: true },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    if (article.assignedEditorId !== editorId) {
      throw new ForbiddenError("You are not assigned to this article");
    }

    if (
      article.status !== "EDITOR_EDITING" &&
      article.status !== "ASSIGNED_TO_EDITOR" &&
      article.status !== "EDITOR_APPROVED" // Allow re-approval (idempotent-like)
    ) {
      throw new BadRequestError("Article cannot be approved in current status");
    }

    // NEW WORKFLOW: Check if reviewer is assigned
    const nextStatus = article.assignedReviewerId ? "ASSIGNED_TO_REVIEWER" : "EDITOR_APPROVED";

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        status: nextStatus,
        editorApprovedAt: new Date(),
        reviewedAt: new Date(),
      },
    });

    await prisma.articleChangeLog.updateMany({
      where: { articleId, status: "pending" },
      data: { status: "approved" },
    });

    // NEW WORKFLOW: Send notification based on next step
    if (article.assignedReviewerId) {
      // Notify reviewer that editor has approved and article is ready for review
      const reviewer = await prisma.user.findUnique({
        where: { id: article.assignedReviewerId }
      });

      if (reviewer) {
        // Import reviewer notification function (will be created)
        const { sendReviewerAssignmentNotification } = await import("@/utils/email.utils.js");
        await sendReviewerAssignmentNotification(
          reviewer.email,
          reviewer.name,
          article.title,
          article.authorName,
          article.category,
          article.id
        );
        console.log(`📧 [New Workflow] Reviewer ${reviewer.name} notified of editor approval`);
      }
    } else {
      // No reviewer assigned - notify admin as before
      await notifyAdminOfEditorApproval(
        articleId,
        article.title,
        article.assignedEditor?.name || "Editor"
      );
      console.log(`📧 [New Workflow] Admin notified of editor approval (no reviewer assigned)`);
    }

    console.log(
      `✅ [Editor Approval] Article ${articleId} approved by editor ${editorId}, next: ${nextStatus}`
    );

    return updatedArticle;
  }

  // NEW: Admin assigns reviewer (after editor approval)
  async assignReviewer(
    articleId: string,
    reviewerId: string,
    adminId: string,
    reason?: string
  ) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { assignedReviewer: true },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    // Can assign reviewer after editor approval or if already assigned to reviewer
    const allowedStatuses = ["EDITOR_APPROVED", "ASSIGNED_TO_REVIEWER", "REVIEWER_EDITING"];
    if (!allowedStatuses.includes(article.status)) {
      throw new BadRequestError(
        `Cannot assign reviewer in current status: ${article.status}. Must be editor approved first.`
      );
    }

    if (article.assignedReviewerId === reviewerId) {
      throw new BadRequestError("Article is already assigned to this reviewer");
    }

    const newReviewer = await prisma.user.findUnique({
      where: { id: reviewerId },
    });
    if (!newReviewer) {
      throw new NotFoundError("Reviewer not found");
    }

    const isReassignment = !!article.assignedReviewerId;
    const oldReviewer = article.assignedReviewer;

    console.log(
      isReassignment
        ? `🔄 [Reviewer Reassignment] Article ${articleId}: ${oldReviewer?.name} → ${newReviewer.name}`
        : `✨ [Reviewer Assignment] Article ${articleId}: → ${newReviewer.name}`
    );

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        assignedReviewerId: reviewerId,
        status: "ASSIGNED_TO_REVIEWER",
      },
      include: { assignedReviewer: true },
    });

    // Send notifications
    const { sendReviewerAssignmentNotification, sendReviewerReassignmentNotification } = await import("@/utils/email.utils.js");

    if (isReassignment && oldReviewer) {
      await sendReviewerReassignmentNotification(
        oldReviewer.email,
        oldReviewer.name,
        article.title,
        article.id
      );
    }

    await sendReviewerAssignmentNotification(
      newReviewer.email,
      newReviewer.name,
      article.title,
      article.authorName,
      article.category,
      article.id
    );

    console.log(`✅ [Reviewer Assignment] Article ${articleId} assigned to reviewer ${reviewerId}`);

    return {
      article: updatedArticle,
      isReassignment,
      oldReviewer: isReassignment
        ? { id: oldReviewer?.id, name: oldReviewer?.name, email: oldReviewer?.email }
        : null,
      newReviewer: {
        id: newReviewer.id,
        name: newReviewer.name,
        email: newReviewer.email,
      },
    };
  }

  // NEW: Reviewer uploads corrected document (DOCX only)
  async reviewerUploadCorrectedDocument(
    articleId: string,
    reviewerId: string,
    data: UploadCorrectedPdfData
  ) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    if (article.assignedReviewerId !== reviewerId) {
      throw new ForbiddenError("You are not assigned as reviewer to this article");
    }

    const validStatuses = [
      "ASSIGNED_TO_REVIEWER",
      "REVIEWER_EDITING",
      "REVIEWER_IN_PROGRESS",
      "ASSIGNED_TO_EDITOR",
      "EDITOR_IN_PROGRESS",
      "EDITOR_EDITING",
      "EDITOR_APPROVED"
    ];
    if (!validStatuses.includes(article.status)) {
      throw new BadRequestError(
        `Cannot upload corrections in current status: ${article.status}`
      );
    }

    // Validate uploaded file is DOCX (reviewers can only upload DOCX)
    if (!data.presignedUrl.toLowerCase().endsWith('.docx')) {
      throw new BadRequestError('Reviewers can only upload DOCX files');
    }

    try {
      // Process reviewer's DOCX upload (supports both local paths and S3 URLs)
      const docxPath = resolveToAbsolutePath(data.presignedUrl);
      console.log(`📄 [Reviewer Upload] Processing DOCX: ${docxPath}`);

      // Convert DOCX to PDF for preview
      const pdfPath = docxPath.replace(/\.docx$/i, '_reviewer.pdf');
      console.log(`🔄 [Adobe] Converting reviewer DOCX to PDF`);
      await adobeService.convertDocxToPdf(docxPath, pdfPath);

      // Extract text from PDF for content
      console.log(`🔍 [Adobe] Extracting text from reviewer PDF`);
      let extractedText = await adobeService.extractTextFromPdf(pdfPath);

      // If PDF extraction failed (returned fallback message), try Mammoth on DOCX
      if (extractedText.includes("Text could not be extracted")) {
        console.warn(`⚠️ [workflow] PDF extraction failed, falling back to Mammoth for DOCX...`);
        try {
          extractedText = await adobeService.extractTextFromDocxUsingMammoth(docxPath);
        } catch (mammothError) {
          console.error("❌ [workflow] Mammoth fallback failed:", mammothError);
        }
      }

      // Create watermarked versions
      const watermarkData = {
        userName: 'LAW NATION REVIEWER',
        downloadDate: new Date(),
        articleTitle: article.title,
        articleId: article.id,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      };

      // Watermark DOCX
      const watermarkedDocxPath = docxPath.replace(/\.docx$/i, '_reviewer_watermarked.docx');
      await adobeService.addWatermarkToDocx(docxPath, watermarkedDocxPath, watermarkData);

      // Watermark PDF
      const watermarkedPdfPath = pdfPath.replace(/\.pdf$/i, '_watermarked.pdf');
      await adobeService.addWatermarkToPdf(pdfPath, watermarkedPdfPath, watermarkData);

      // Convert paths to relative for database
      const { convertToWebPath } = await import('@/utils/file-path.utils.js');
      const relativeWatermarkedDocx = convertToWebPath(watermarkedDocxPath);
      const relativeWatermarkedPdf = convertToWebPath(watermarkedPdfPath);

      // Update article with reviewer's version
      const updatedArticle = await prisma.article.update({
        where: { id: articleId },
        data: {
          content: extractedText,
          contentHtml: extractedText.replace(/\n/g, '<br>'),
          currentPdfUrl: relativeWatermarkedPdf,
          currentWordUrl: relativeWatermarkedDocx,
          status: "REVIEWER_IN_PROGRESS",
          reviewedAt: new Date(),
        },
      });

      // Create change log for reviewer
      await prisma.articleChangeLog.create({
        data: {
          articleId: article.id,
          versionNumber: await this.getNextVersionNumber(articleId),
          oldFileUrl: article.currentWordUrl || "",
          newFileUrl: relativeWatermarkedDocx,
          fileType: "DOCX",
          diffData: {
            type: "reviewer_edit",
            message: "Document reviewed and edited by reviewer",
            extractedTextLength: extractedText.length,
          } as any,
          editedBy: reviewerId,
          status: "pending",
          comments: data.comments || "Document reviewed by reviewer",
        },
      });

      console.log(`✅ [Reviewer Upload] Article ${articleId} processed by reviewer ${reviewerId}`);

      return {
        message: "Document reviewed and processed successfully",
        article: updatedArticle,
        extractedTextLength: extractedText.length,
        files: {
          watermarkedDocx: relativeWatermarkedDocx,
          watermarkedPdf: relativeWatermarkedPdf,
        }
      };

    } catch (error: any) {
      console.error(`❌ [Reviewer Upload] Failed to process article ${articleId}:`, error);
      throw new InternalServerError(`Failed to process reviewer document: ${error.message}`);
    }
  }

  // NEW: Reviewer approves article (sends to admin for publishing)
  async reviewerApproveArticle(articleId: string, reviewerId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { assignedReviewer: true },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    if (article.assignedReviewerId !== reviewerId) {
      throw new ForbiddenError("You are not assigned as reviewer to this article");
    }

    const validStatuses = ["ASSIGNED_TO_REVIEWER", "REVIEWER_EDITING", "REVIEWER_IN_PROGRESS"];
    if (!validStatuses.includes(article.status)) {
      throw new BadRequestError("Article cannot be approved in current status");
    }

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        status: "REVIEWER_APPROVED",
        reviewedAt: new Date(),
      },
    });

    // Mark reviewer's change logs as approved
    await prisma.articleChangeLog.updateMany({
      where: { articleId, status: "pending", editedBy: reviewerId },
      data: { status: "approved" },
    });

    // Notify admin that reviewer has approved
    await notifyAdminOfEditorApproval(
      articleId,
      article.title,
      article.assignedReviewer?.name || "Reviewer"
    );

    console.log(
      `✅ [Reviewer Approval] Article ${articleId} approved by reviewer ${reviewerId}`
    );

    return updatedArticle;
  }

  //Admin approves article directly (without editor)

  async approveArticle(
    articleId: string,
    userId: string,
    userRoles: string[],
    newPdfUrl?: string
  ) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    const isAdmin = userRoles.includes("admin");
    const isAssignedEditor = article.assignedEditorId === userId;

    if (!isAdmin && !isAssignedEditor) {
      throw new ForbiddenError(
        "You do not have permission to approve this article"
      );
    }

    if (!isAdmin) {
      if (
        article.status !== "ASSIGNED_TO_EDITOR" &&
        article.status !== "PENDING_APPROVAL"
      ) {
        throw new BadRequestError(
          "Article cannot be approved in current status"
        );
      }
    } else {
      // Admin can publish from almost any status if they choose to
      const validAdminStatuses = [
        "PENDING_ADMIN_REVIEW",
        "ASSIGNED_TO_EDITOR",
        "PENDING_APPROVAL",
        "EDITOR_EDITING",      // ✅ Allow publishing while editor is working
        "EDITOR_APPROVED",     // ✅ Allow publishing after editor approves
        "ASSIGNED_TO_REVIEWER",// ✅ Allow publishing while assigned to reviewer
        "REVIEWER_IN_PROGRESS",// ✅ Allow publishing while reviewer is working
        "REVIEWER_EDITING",    // ✅ Allow publishing while reviewer is editing
        "REVIEWER_APPROVED"    // ✅ Allow publishing after reviewer approves
      ];

      if (!validAdminStatuses.includes(article.status)) {
        throw new BadRequestError(
          `Article status '${article.status}' does not allow direct publishing. Valid statuses: ${validAdminStatuses.join(', ')}`
        );
      }
    }

    const updateData: any = {
      status: "PUBLISHED",
      approvedAt: new Date(),
      reviewedAt: new Date(),
    };

    if (newPdfUrl) {
      console.log(`♻️ Replacing PDF for article ${articleId} on approval`);
      updateData.currentPdfUrl = newPdfUrl;

      try {
        // Extract text using Adobe PDF extraction instead of mammoth
        // First ensure both formats exist
        const { pdfPath } = await ensureBothFormats(newPdfUrl);
        const extractedText = await adobeService.extractTextFromPdf(pdfPath);

        // Still extract images from PDF
        const pdfImageContent = await extractPdfContent(newPdfUrl, article.id);

        if (extractedText) {
          updateData.content = extractedText;
          updateData.contentHtml = extractedText.replace(/\n/g, '<br>');
        }

        if (pdfImageContent.images && pdfImageContent.images.length > 0) {
          updateData.imageUrls = [
            ...(article.imageUrls || []),
            ...pdfImageContent.images
          ];
        }

        console.log(`✅ [Adobe Extract] Extracted ${extractedText.length} characters from PDF`);
      } catch (error) {
        console.error("Failed to extract content using Adobe:", error);
        // Fallback to old method
        try {
          const pdfContent = await extractPdfContent(newPdfUrl, article.id);
          if (pdfContent.text) {
            updateData.content = pdfContent.text;
            updateData.contentHtml = pdfContent.html;
          }
        } catch (fallbackError) {
          console.error("Fallback extraction also failed:", fallbackError);
        }
      }
    }

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: updateData,
    });

    sendArticleApprovalNotification(
      article.authorEmail,
      article.authorName,
      article.title,
      article.id
    );

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

  //Admin publishes article (NEW WORKFLOW: handles editor-only, reviewer, or admin override)

  async adminPublishArticle(articleId: string, adminId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { assignedEditor: true, assignedReviewer: true },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    // NEW WORKFLOW: Admin can publish in multiple scenarios
    const validStatuses = [
      "EDITOR_APPROVED",        // Editor approved, no reviewer
      "REVIEWER_APPROVED",      // Reviewer approved after editor
      "PENDING_ADMIN_REVIEW",   // Admin override - no editor/reviewer assigned
      "ASSIGNED_TO_EDITOR",     // Admin override - editor assigned but admin publishes directly
      "ASSIGNED_TO_REVIEWER",   // Admin override - reviewer assigned but admin publishes directly
      "EDITOR_EDITING",         // ✅ Allow override while editor is working
      "REVIEWER_IN_PROGRESS",   // ✅ Allow override while reviewer is working
      "REVIEWER_EDITING"        // ✅ Allow override while reviewer is editing
    ];

    if (!validStatuses.includes(article.status)) {
      throw new BadRequestError(
        `Article cannot be published in current status: ${article.status}. Valid statuses: ${validStatuses.join(', ')}`
      );
    }

    // Determine which version to publish based on workflow
    let publishingMessage = "";
    if (article.status === "REVIEWER_APPROVED") {
      publishingMessage = "Publishing reviewer-approved version";
    } else if (article.status === "EDITOR_APPROVED") {
      publishingMessage = "Publishing editor-approved version (no reviewer)";
    } else {
      publishingMessage = "Admin override: Publishing current version directly";
    }

    console.log(`📰 [Admin Publish] ${publishingMessage} for article ${articleId}`);

    // NEW: Handle document vs article publishing differently
    if (article.contentType === 'DOCUMENT') {
      return await this.publishDocument(article, adminId, publishingMessage);
    } else {
      return await this.publishArticle(article, adminId, publishingMessage);
    }
  }

  // NEW: Publish document with Adobe text extraction from final version
  private async publishDocument(article: any, adminId: string, publishingMessage?: string) {
    console.log(`📄 [Document Publish] ${publishingMessage || 'Publishing document'} ${article.id}`);

    let extractedText = '';

    // Extract text from final version using Adobe PDF extraction
    if (article.currentPdfUrl) {
      try {
        console.log(`🔍 [Adobe Extract] Extracting text from final PDF version: ${article.currentPdfUrl}`);
        extractedText = await adobeService.extractTextFromPdf(article.currentPdfUrl);
        console.log(`✅ [Adobe Extract] Extracted ${extractedText.length} characters from final version`);
      } catch (error) {
        console.error('❌ [Adobe Extract] Text extraction failed:', error);

        // Fallback: Try Mammoth extraction from DOCX if available
        if (article.currentWordUrl) {
          try {
            console.log(`🔄 [Fallback] Attempting Mammoth extraction from DOCX: ${article.currentWordUrl}`);
            const resolveToAbsolutePath = (await import("@/utils/file-path.utils.js")).resolveToAbsolutePath;
            const docxPath = resolveToAbsolutePath(article.currentWordUrl);

            const mammothText = await adobeService.extractTextFromDocxUsingMammoth(docxPath);
            if (mammothText && mammothText.length > 0) {
              extractedText = mammothText;
              console.log(`✅ [Fallback] Mammoth extraction successful (${mammothText.length} characters)`);
            } else {
              extractedText = 'Text extraction failed. Please contact administrator.';
            }
          } catch (mammothError) {
            console.error('❌ [Fallback] Mammoth extraction also failed:', mammothError);
            extractedText = 'Text extraction failed. Please contact administrator.';
          }
        } else {
          extractedText = 'Text extraction failed. Please contact administrator.';
        }
      }
    } else {
      console.warn('⚠️ [Document Publish] No final PDF version available for text extraction');
      extractedText = 'Document not yet processed. Please contact administrator.';
    }

    // NEW: Extract HTML from DOCX for better formatting if available
    let contentHtml = '';
    if (article.currentWordUrl) {
      try {
        console.log(`✨ [Document Publish] Attempting HTML extraction from DOCX...`);

        // Try to find CLEAN docx first to avoid watermarks (logos) in HTML
        let docxPath = article.currentWordUrl;
        const cleanDocxPath = docxPath.replace(/_watermarked|_edited_watermarked|_edited/g, '').replace('.docx', '.docx'); // simple cleanup heuristic
        // Proper heuristic: try removing suffixes
        const potentialCleanPaths = [
          docxPath.replace('_edited_watermarked.docx', '.docx'),
          docxPath.replace('_watermarked.docx', '.docx'),
          docxPath.replace('_edited.docx', '.docx')
        ];

        const fs = await import('fs');
        const { resolveToAbsolutePath } = await import("@/utils/file-path.utils.js");

        let foundClean = false;
        for (const p of potentialCleanPaths) {
          if (p !== docxPath && p.endsWith('.docx')) {
            try {
              const absPath = resolveToAbsolutePath(p);
              if (fs.existsSync(absPath)) {
                console.log(`✅ [Document Publish] Found clean DOCX for HTML extraction: ${p}`);
                docxPath = p;
                foundClean = true;
                break;
              }
            } catch (e) { /* ignore */ }
          }
        }

        if (!foundClean) console.log(`⚠️ [Document Publish] Clean DOCX not found, using current (may have watermark): ${docxPath}`);

        contentHtml = await adobeService.extractHtmlFromDocxUsingMammoth(docxPath);
        console.log(`✅ [Document Publish] Extracted HTML (${contentHtml.length} characters)`);
      } catch (error) {
        console.error('❌ [Document Publish] HTML extraction failed:', error);
        // Fallback to text with line breaks
        contentHtml = extractedText.replace(/\n/g, '<br>');
      }
    } else {
      // Fallback
      contentHtml = extractedText.replace(/\n/g, '<br>');
    }

    // Update article with extracted text and published status
    const updatedArticle = await prisma.article.update({
      where: { id: article.id },
      data: {
        status: "PUBLISHED",
        approvedAt: new Date(),
        content: extractedText, // Store text from final version for user display
        contentHtml: contentHtml, // Store HTML for rich formatting
        finalPdfUrl: article.currentPdfUrl, // Set final published version
      },
    });

    // Mark all change logs as published
    await prisma.articleChangeLog.updateMany({
      where: { articleId: article.id, status: "approved" },
      data: { status: "published" },
    });

    // Complete editor assignment if exists
    if (article.assignedEditorId) {
      await articleHistoryService.markAsCompleted(
        article.id,
        article.assignedEditorId
      );
    }

    // Notify uploader with appropriate message
    const notificationMessage = publishingMessage || "Document has been professionally processed and published";
    await notifyUploaderOfPublication(
      article.id,
      article.title,
      article.authorEmail,
      article.authorName,
      notificationMessage
    );

    console.log(`✅ [Document Publish] Document ${article.id} published successfully`);

    return {
      message: "Document published successfully",
      article: updatedArticle,
      extractedText: extractedText,
      publishingMessage,
    };
  }

  // Enhanced article publishing logic with new workflow support
  private async publishArticle(article: any, adminId: string, publishingMessage?: string) {
    let finalDiffSummary = "No changes made";

    if (article.originalPdfUrl !== article.currentPdfUrl) {
      try {
        console.log(
          `📊 [Final Diff] Calculating original vs final for author...`
        );
        const finalDiff = await calculateFileDiff(
          article.originalPdfUrl,
          article.currentPdfUrl
        );
        // finalDiffSummary = generateDiffSummary(finalDiff); // COMMENTED: Frontend handles diff calculation
        finalDiffSummary = "Changes made - view in frontend diff viewer";
        console.log(`✅ [Final Diff] ${finalDiffSummary}`);
      } catch (error) {
        console.error("❌ [Final Diff] Failed to calculate:", error);
        finalDiffSummary = "Changes were made during review";
      }
    } else {
      console.log(
        `ℹ️ [Final Diff] No changes - original and current are the same`
      );
    }

    // Extract text from final version for user display
    let extractedText = '';

    // First, check if we already have clean extracted text
    if (article.content && article.content.trim().length > 0) {
      // Check if the content looks clean (not corrupted binary data)
      const hasCorruptedData = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]|PKx|��|AEstructuredData/.test(article.content);

      if (!hasCorruptedData && !article.content.includes("PDF file is corrupted") && !article.content.includes("Text could not be extracted")) {
        console.log(`✅ [Article Publish] Using existing clean content (${article.content.length} characters)`);
        extractedText = article.content;
      } else {
        console.log(`⚠️ [Article Publish] Existing content appears corrupted, re-extracting...`);
        extractedText = await this.extractTextForPublishing(article);
      }
    } else {
      console.log(`ℹ️ [Article Publish] No existing content, extracting text...`);
      extractedText = await this.extractTextForPublishing(article);

      // If PDF extraction failed (returned fallback message), check if we have a DOCX to fallback to
      if (extractedText.includes("Text could not be extracted") && article.currentWordUrl) {
        console.warn(`⚠️ [Article Publish] PDF extraction failed during publish, falling back to Mammoth for DOCX...`);
        try {
          const resolveToAbsolutePath = (await import("@/utils/file-path.utils.js")).resolveToAbsolutePath;
          const docxPath = resolveToAbsolutePath(article.currentWordUrl);
          const mammothText = await adobeService.extractTextFromDocxUsingMammoth(docxPath);
          if (mammothText && mammothText.length > 0) {
            console.log(`✅ [Article Publish] Mammoth fallback successful (${mammothText.length} chars)`);
            extractedText = mammothText;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    // NEW: Extract HTML from DOCX for rich formatting
    let contentHtml = '';
    // Prefer currentWordUrl if available (most likely to have correct formatting)
    // Or if originalWordUrl is available and no edits were made
    const wordUrl = article.currentWordUrl || (article.originalPdfUrl === article.currentPdfUrl ? article.originalWordUrl : null);

    if (wordUrl) {
      try {
        console.log(`✨ [Article Publish] Attempting HTML extraction from DOCX...`);

        // Try to find CLEAN docx first to avoid watermarks (logos) in HTML
        let docxPath = wordUrl;
        const potentialCleanPaths = [
          docxPath.replace(/_edited_watermarked\.docx$/i, '.docx'),
          docxPath.replace(/_watermarked\.docx$/i, '.docx'),
          docxPath.replace(/_edited\.docx$/i, '.docx')
        ];

        const fs = await import('fs');
        const { resolveToAbsolutePath } = await import("@/utils/file-path.utils.js");

        let foundClean = false;
        for (const p of potentialCleanPaths) {
          if (p !== docxPath && p.toLowerCase().endsWith('.docx')) {
            try {
              const absPath = resolveToAbsolutePath(p);
              if (fs.existsSync(absPath)) {
                console.log(`✅ [Article Publish] Found clean DOCX for HTML extraction: ${p}`);
                docxPath = p;
                foundClean = true;
                break;
              }
            } catch (e) { /* ignore */ }
          }
        }

        if (!foundClean) console.log(`⚠️ [Article Publish] Clean DOCX not found, using available (may have watermark): ${docxPath}`);

        contentHtml = await adobeService.extractHtmlFromDocxUsingMammoth(docxPath);
        console.log(`✅ [Article Publish] Extracted HTML (${contentHtml.length} characters)`);
      } catch (error) {
        console.error('❌ [Article Publish] HTML extraction failed:', error);
        // Fallback to text with line breaks
        contentHtml = extractedText ? extractedText.replace(/\n/g, '<br>') : '';
      }
    } else {
      // Fallback
      contentHtml = extractedText ? extractedText.replace(/\n/g, '<br>') : '';
    }

    const updatedArticle = await prisma.article.update({
      where: { id: article.id },
      data: {
        status: "PUBLISHED",
        approvedAt: new Date(),
        reviewedAt: new Date(),
        // content: extractedText, // Don't overwrite existing text if it's there
        ...(extractedText && { content: extractedText }),
        contentHtml: contentHtml,
        finalPdfUrl: article.currentPdfUrl, // Set final published version
      },
    });

    await prisma.articleChangeLog.updateMany({
      where: { articleId: article.id, status: "approved" },
      data: { status: "published" },
    });

    if (article.assignedEditorId) {
      await articleHistoryService.markAsCompleted(
        article.id,
        article.assignedEditorId
      );
    }

    // Use custom message if provided, otherwise use diff summary
    const notificationMessage = publishingMessage || finalDiffSummary;

    await notifyUploaderOfPublication(
      article.id,
      article.title,
      article.authorEmail,
      article.authorName,
      notificationMessage
    );

    if (article.secondAuthorEmail && article.secondAuthorName) {
      await notifyUploaderOfPublication(
        article.id,
        article.title,
        article.secondAuthorEmail,
        article.secondAuthorName,
        notificationMessage
      );
    }

    console.log(
      `✅ [Admin Publish] Article ${article.id} published by admin ${adminId}`
    );

    return {
      article: updatedArticle,
      diffSummary: finalDiffSummary,
      extractedText: extractedText,
      publishingMessage,
    };
  }

  //Delete article (Admin only)

  async deleteArticle(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    await prisma.article.delete({ where: { id: articleId } });

    return { message: "Article deleted successfully" };
  }

  // NEW: Handle article reassignments when editor/reviewer access is removed
  async handleAccessRemovalReassignments(
    userId: string,
    userType: 'EDITOR' | 'REVIEWER'
  ): Promise<{ reassignedCount: number; articleIds: string[] }> {
    console.log(`🔄 [Access Removal] Handling article reassignments for ${userType}: ${userId}`);

    if (userType === 'EDITOR') {
      // Find articles assigned to this editor that are in progress
      const assignedArticles = await prisma.article.findMany({
        where: {
          assignedEditorId: userId,
          status: {
            in: ['ASSIGNED_TO_EDITOR', 'EDITOR_IN_PROGRESS', 'EDITOR_EDITING']
          }
        },
        select: { id: true, title: true }
      });

      if (assignedArticles.length > 0) {
        // Unassign articles - admin will need to reassign manually
        await prisma.article.updateMany({
          where: {
            assignedEditorId: userId,
            status: {
              in: ['ASSIGNED_TO_EDITOR', 'EDITOR_IN_PROGRESS', 'EDITOR_EDITING']
            }
          },
          data: {
            assignedEditorId: null,
            status: 'PENDING_ADMIN_REVIEW'
          }
        });

        // Log the reassignments in article history
        for (const article of assignedArticles) {
          await articleHistoryService.logUnassignment({
            articleId: article.id,
            editorId: userId,
            reason: 'Editor access removed by admin'
          });
        }

        console.log(`✅ [Access Removal] Unassigned ${assignedArticles.length} articles from editor`);
        return {
          reassignedCount: assignedArticles.length,
          articleIds: assignedArticles.map(a => a.id)
        };
      }
    } else if (userType === 'REVIEWER') {
      // Find articles assigned to this reviewer that are in progress
      const assignedReviews = await prisma.article.findMany({
        where: {
          assignedReviewerId: userId,
          status: {
            in: ['ASSIGNED_TO_REVIEWER', 'REVIEWER_IN_PROGRESS', 'REVIEWER_EDITING']
          }
        },
        select: { id: true, title: true }
      });

      if (assignedReviews.length > 0) {
        // Unassign reviews - revert to editor approved state
        await prisma.article.updateMany({
          where: {
            assignedReviewerId: userId,
            status: {
              in: ['ASSIGNED_TO_REVIEWER', 'REVIEWER_IN_PROGRESS', 'REVIEWER_EDITING']
            }
          },
          data: {
            assignedReviewerId: null,
            status: 'EDITOR_APPROVED' // Back to editor approved state
          }
        });

        console.log(`✅ [Access Removal] Unassigned ${assignedReviews.length} reviews from reviewer`);
        return {
          reassignedCount: assignedReviews.length,
          articleIds: assignedReviews.map(a => a.id)
        };
      }
    }

    return { reassignedCount: 0, articleIds: [] };
  }
}

export const articleWorkflowService = new ArticleWorkflowService();
