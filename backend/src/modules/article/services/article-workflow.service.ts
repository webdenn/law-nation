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
    data: UploadCorrectedPdfData
  ) {
    console.log(`🚀 [Improved Workflow] Starting improved editor upload for article ${articleId}`);

    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    if (article.assignedEditorId !== editorId) {
      throw new ForbiddenError("You are not assigned to this article");
    }

    // Validate uploaded file is DOCX
    if (!data.pdfUrl.toLowerCase().endsWith('.docx')) {
      throw new BadRequestError('Please upload a DOCX file');
    }

    try {
      // Step 1: Process clean DOCX (editor's upload)
      const cleanDocxPath = resolveToAbsolutePath(data.pdfUrl);
      console.log(`📄 [Clean Process] Processing clean DOCX: ${cleanDocxPath}`);

      if (!fileExistsAtPath(data.pdfUrl)) {
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

          // Update status
          status: "EDITOR_APPROVED",
        },
      });

      // Step 8: Create change log
      await prisma.articleChangeLog.create({
        data: {
          articleId: article.id,
          versionNumber: await this.getNextVersionNumber(articleId),
          oldFileUrl: article.currentWordUrl || "",
          newFileUrl: relativeWatermarkedDocx,
          fileType: "DOCX",
          diffData: {
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

    // Allow corrections in multiple statuses
    const validStatuses = [
      "ASSIGNED_TO_EDITOR",
      "EDITOR_EDITING",
      "EDITOR_APPROVED", // Allow re-editing
      "PENDING_ADMIN_REVIEW" // Allow editing before assignment
    ];

    if (!validStatuses.includes(article.status)) {
      throw new BadRequestError(
        `Article status '${article.status}' does not allow corrections. Valid statuses: ${validStatuses.join(', ')}`
      );
    }

    // NEW: Use improved workflow for DOCX uploads
    if (data.pdfUrl.toLowerCase().endsWith('.docx')) {
      console.log(`🚀 [Upload] Using improved workflow for DOCX upload`);
      return await this.uploadCorrectedDocxImproved(articleId, editorId, data);
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
    let docxPath = data.pdfUrl; // This is actually a DOCX file for documents

    // Fix path resolution - convert relative path to absolute if needed
    if (docxPath.startsWith('/uploads/')) {
      docxPath = docxPath.replace('/uploads/', 'uploads/');
      docxPath = path.join(process.cwd(), docxPath);
      console.log(`📂 [Document Edit] Resolved absolute path: ${docxPath}`);
    }

    // Validate it's actually a DOCX file
    if (!docxPath.toLowerCase().endsWith('.docx')) {
      throw new Error('Document workflow requires DOCX files');
    }

    // Verify file exists
    const fs = await import('fs');
    if (!fs.existsSync(docxPath)) {
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

    const watermarkedDocxPath = docxPath.replace(/\.docx$/i, '_edited_watermarked.docx');
    await adobeService.addWatermarkToDocx(docxPath, watermarkedDocxPath, watermarkData);

    // Convert edited DOCX to PDF for preview using Adobe Services
    const pdfPath = docxPath.replace(/\.docx$/i, '_edited.pdf');
    console.log(`🔄 [Adobe] Converting DOCX to PDF for preview: ${watermarkedDocxPath} → ${pdfPath}`);
    await adobeService.convertDocxToPdf(watermarkedDocxPath, pdfPath);

    // Convert absolute paths back to relative for database storage
    const relativePdfPath = pdfPath.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, '');
    const relativeDocxPath = watermarkedDocxPath.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, '');

    // Update article with edited versions
    await prisma.article.update({
      where: { id: article.id },
      data: {
        currentPdfUrl: `/${relativePdfPath}`,
        currentWordUrl: `/${relativeDocxPath}`,
        status: "EDITOR_APPROVED",
      },
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
      article: { id: article.id, status: "EDITOR_APPROVED" },
    };
  }

  // Existing article editing logic - Enhanced to detect DOCX uploads
  private async handleArticleEdit(article: any, editorId: string, data: UploadCorrectedPdfData) {
    // Check if this is a DOCX upload - if so, treat as document workflow
    const isDocxUpload = data.pdfUrl.toLowerCase().endsWith('.docx');

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
      `📄 [Editor Upload] Converting file to both formats: ${data.pdfUrl}`
    );
    const { pdfPath, wordPath } = await ensureBothFormats(data.pdfUrl);

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

  //Editor approves article (submits for publishing)

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

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        status: "EDITOR_APPROVED",
        editorApprovedAt: new Date(),
        reviewedAt: new Date(),
      },
    });

    await prisma.articleChangeLog.updateMany({
      where: { articleId, status: "pending" },
      data: { status: "approved" },
    });

    await notifyAdminOfEditorApproval(
      articleId,
      article.title,
      article.assignedEditor?.name || "Editor"
    );

    console.log(
      `✅ [Editor Approval] Article ${articleId} approved by editor ${editorId}`
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
      if (
        article.status !== "PENDING_ADMIN_REVIEW" &&
        article.status !== "ASSIGNED_TO_EDITOR" &&
        article.status !== "PENDING_APPROVAL"
      ) {
        throw new BadRequestError(
          "Article cannot be approved in current status"
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

  //Admin publishes article (only after editor approval)

  async adminPublishArticle(articleId: string, adminId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { assignedEditor: true },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    if (article.status !== "EDITOR_APPROVED") {
      throw new BadRequestError(
        "Article must be approved by editor before publishing. Current status: " +
        article.status
      );
    }

    // NEW: Handle document vs article publishing differently
    if (article.contentType === 'DOCUMENT') {
      return await this.publishDocument(article, adminId);
    } else {
      return await this.publishArticle(article, adminId);
    }
  }

  // NEW: Publish document with Adobe text extraction from edited version
  private async publishDocument(article: any, adminId: string) {
    console.log(`📄 [Document Publish] Publishing document ${article.id} with Adobe text extraction from edited version`);

    let extractedText = '';

    // Extract text from edited version using Adobe PDF extraction
    if (article.currentPdfUrl) {
      try {
        console.log(`🔍 [Adobe Extract] Extracting text from edited PDF version: ${article.currentPdfUrl}`);
        extractedText = await adobeService.extractTextFromPdf(article.currentPdfUrl);
        console.log(`✅ [Adobe Extract] Extracted ${extractedText.length} characters from edited version`);
      } catch (error) {
        console.error('❌ [Adobe Extract] Text extraction failed:', error);
        extractedText = 'Text extraction failed. Please contact administrator.';
      }
    } else {
      console.warn('⚠️ [Document Publish] No edited PDF version available for text extraction');
      extractedText = 'Document not yet edited. Please contact administrator.';
    }

    // Update article with extracted text and published status
    const updatedArticle = await prisma.article.update({
      where: { id: article.id },
      data: {
        status: "PUBLISHED",
        approvedAt: new Date(),
        content: extractedText, // Store text from edited version for user display
      },
    });

    // Mark change logs as published
    await prisma.articleChangeLog.updateMany({
      where: { articleId: article.id, status: "approved" },
      data: { status: "published" },
    });

    // Complete editor assignment
    if (article.assignedEditorId) {
      await articleHistoryService.markAsCompleted(
        article.id,
        article.assignedEditorId
      );
    }

    // Notify uploader
    await notifyUploaderOfPublication(
      article.id,
      article.title,
      article.authorEmail,
      article.authorName,
      "Document has been professionally edited and published - users will see the corrected version"
    );

    console.log(`✅ [Document Publish] Document ${article.id} published successfully with edited version text extraction`);

    return {
      message: "Document published successfully with edited version text extraction",
      article: updatedArticle,
      extractedText: extractedText,
    };
  }

  // Existing article publishing logic - Enhanced with text extraction
  private async publishArticle(article: any, adminId: string) {
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


    // NEW: Extract text from current/edited version for user display
    let extractedText = '';

    // First, check if we already have clean extracted text
    if (article.content && article.content.trim().length > 0) {
      // Check if the content looks clean (not corrupted binary data)
      const hasCorruptedData = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]|PKx|��|AEstructuredData/.test(article.content);

      if (!hasCorruptedData) {
        console.log(`✅ [Article Publish] Using existing clean content (${article.content.length} characters)`);
        extractedText = article.content;
      } else {
        console.log(`⚠️ [Article Publish] Existing content appears corrupted, re-extracting...`);
        extractedText = await this.extractTextForPublishing(article);
      }
    } else {
      console.log(`ℹ️ [Article Publish] No existing content, extracting text...`);
      extractedText = await this.extractTextForPublishing(article);
    }

    const updatedArticle = await prisma.article.update({
      where: { id: article.id },
      data: {
        status: "PUBLISHED",
        approvedAt: new Date(),
        content: extractedText, // Store extracted text from edited version
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

    await notifyUploaderOfPublication(
      article.id,
      article.title,
      article.authorEmail,
      article.authorName,
      finalDiffSummary
    );

    if (article.secondAuthorEmail && article.secondAuthorName) {
      await notifyUploaderOfPublication(
        article.id,
        article.title,
        article.secondAuthorEmail,
        article.secondAuthorName,
        finalDiffSummary
      );
    }

    console.log(
      `✅ [Admin Publish] Article ${article.id} published by admin ${adminId} with text extraction`
    );

    return {
      article: updatedArticle,
      diffSummary: finalDiffSummary,
      extractedText: extractedText,
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
}

export const articleWorkflowService = new ArticleWorkflowService();
