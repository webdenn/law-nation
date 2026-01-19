import { prisma } from "@/db/db.js";
import path from "path";
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from "@/utils/http-errors.util.js";
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

    // NEW: Handle document vs article processing differently
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
      // Extract text from the converted DOCX using Adobe services for better quality
      const extractedText = await adobeService.extractTextFromDocx(wordPath);
      
      // Still extract images from PDF
      const pdfImageContent = await extractPdfContent(pdfPath, article.id);
      
      pdfContent = {
        text: extractedText,
        html: extractedText.replace(/\n/g, '<br>'), // Simple HTML conversion
        images: pdfImageContent.images || []
      };
      
      console.log(`✅ [Adobe Extract] Extracted ${extractedText.length} characters from DOCX`);
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
        // Extract text from the converted DOCX using Adobe services for better quality
        // First ensure both formats exist
        const { wordPath } = await ensureBothFormats(newPdfUrl);
        const extractedText = await adobeService.extractTextFromDocxUsingMammoth(wordPath);
        
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
        
        console.log(`✅ [Adobe Extract] Extracted ${extractedText.length} characters from DOCX`);
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

    // Extract text from edited DOCX using Adobe services (corrected version for users)
    if (article.currentWordUrl) {
      try {
        console.log(`🔍 [Adobe Extract] Extracting text from edited version: ${article.currentWordUrl}`);
        extractedText = await adobeService.extractTextFromDocxUsingMammoth(article.currentWordUrl);
        console.log(`✅ [Adobe Extract] Extracted ${extractedText.length} characters from edited version`);
      } catch (error) {
        console.error('❌ [Adobe Extract] Text extraction failed:', error);
        extractedText = 'Text extraction failed. Please contact administrator.';
      }
    } else {
      console.warn('⚠️ [Document Publish] No edited DOCX version available for text extraction');
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
    const fs = await import('fs');
    const path = await import('path');

    if (article.currentWordUrl) {
      try {
        // Fix: Resolve absolute path properly for local/server filesystem
        // article.currentWordUrl typically comes as "/uploads/words/filename.docx" or similar
        const relativePath = article.currentWordUrl.startsWith('/')
          ? article.currentWordUrl.substring(1)
          : article.currentWordUrl;

        let absoluteScanPath = "";

        // Handle different environments (Local vs Production paths)
        if (article.currentWordUrl.startsWith("http")) {
          // If it's a full URL (SS3/Cloud), we can't extract locally easily without downloading
          // skipping for now or assume path mapping
          console.log(`ℹ️ [Article Publish] Skipping extraction for remote URL: ${article.currentWordUrl}`);
          extractedText = article.content || "";
        } else {
          absoluteScanPath = path.join(process.cwd(), relativePath);

          // Check if it exists, if not, try uploads folder specifically if not included
          if (!fs.existsSync(absoluteScanPath) && !relativePath.startsWith('uploads')) {
            absoluteScanPath = path.join(process.cwd(), 'uploads', relativePath);
          }

          if (fs.existsSync(absoluteScanPath)) {
            extractedText = await adobeService.extractTextFromDocxUsingMammoth(absoluteScanPath);
            console.log(`✅ [Article Publish] Extracted ${extractedText.length} characters from edited version`);
          } else {
            throw new Error(`DOCX file not found at path: ${absoluteScanPath}`);
          }
        }

      } catch (error) {
        console.error('❌ [Article Publish] Adobe text extraction failed:', error);

        // Fallback: Try extracting from PDF using pdf-parse (Robust backup)
        if (article.currentPdfUrl) {
          try {
            console.log(`⚠️ [Article Publish] Attempting fallback extraction from PDF: ${article.currentPdfUrl}`);
            const createRequire = (await import('module')).createRequire;
            const require = createRequire(import.meta.url);
            const pdfParse = require('pdf-parse');

            const relativePdfPath = article.currentPdfUrl.startsWith('/') ? article.currentPdfUrl.substring(1) : article.currentPdfUrl;
            let absolutePdfPath = path.join(process.cwd(), relativePdfPath);

            if (!fs.existsSync(absolutePdfPath) && !relativePdfPath.startsWith('uploads')) {
              absolutePdfPath = path.join(process.cwd(), 'uploads', relativePdfPath);
            }

            if (fs.existsSync(absolutePdfPath)) {
              const dataBuffer = fs.readFileSync(absolutePdfPath);
              const data = await pdfParse(dataBuffer);
              extractedText = data.text;
              console.log(`✅ [Article Publish] Fallback PDF extraction successful (${extractedText.length} chars)`);
            } else {
              console.error(`❌ [Article Publish] Fallback PDF file also not found: ${absolutePdfPath}`);
              extractedText = article.content || 'Text extraction failed. Please contact administrator.';
            }
          } catch (pdfError) {
            console.error('❌ [Article Publish] Fallback PDF extraction failed:', pdfError);
            extractedText = article.content || 'Text extraction failed. Please contact administrator.';
          }
        } else {
          extractedText = article.content || 'Text extraction failed. Please contact administrator.';
        }
      }
    } else if (article.content) {
      // Use existing extracted content if no Word version available
      extractedText = article.content;
      console.log(`ℹ️ [Article Publish] Using existing extracted content (${extractedText.length} characters)`);
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
