import { prisma } from "@/db/db.js";
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from "@/utils/http-errors.util.js";
import { ensureBothFormats } from "@/utils/file-conversion.utils.js";
import { generateDiffPdf } from "@/utils/diff-pdf-generator.utils.js";
import { generateDiffWord } from "@/utils/diff-word-generator.utils.js";
import { adobeService } from "@/services/adobe.service.js";
import path from "path";
//Article Download Service Handles PDF/Word downloads and diff generation
export class ArticleDownloadService {
  //Get PDF URL for download (for logged-in users) - Serves edited/corrected version
  async getArticlePdfUrl(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId, status: "PUBLISHED" },
      select: { 
        currentPdfUrl: true, // This is the edited/corrected version
        title: true,
        contentType: true 
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found or not published");
    }

    console.log(`📥 [Download PDF] Serving edited/corrected version: ${article.currentPdfUrl}`);
    return article;
  }
  // Get Word URL for download (for all logged-in users) - Serves edited/corrected version
  async getArticleWordUrl(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId, status: "PUBLISHED" },
      select: { 
        currentWordUrl: true, // This is the edited/corrected version
        title: true,
        contentType: true 
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found or not published");
    }

    if (!article.currentWordUrl) {
      throw new NotFoundError("Word version not available for this article");
    }

    console.log(`📥 [Download Word] Serving edited/corrected version: ${article.currentWordUrl}`);
    return article;
  }
  
  // NEW: Get original DOCX URL (converted from user's original PDF)
  async getOriginalDocxUrl(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { 
        originalWordUrl: true, 
        title: true,
        contentType: true,
        status: true 
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    // For documents, we need to check if original DOCX was created from PDF
    if (article.contentType === 'DOCUMENT' && !article.originalWordUrl) {
      throw new NotFoundError("Original DOCX not available - document may not have been processed yet");
    }

    if (!article.originalWordUrl) {
      throw new NotFoundError("Original DOCX version not available for this article");
    }

    return article;
  }
  
  // NEW: Download original DOCX with watermark using Adobe services
  async downloadOriginalDocxWithWatermark(articleId: string, watermarkData: any) {
    const article = await this.getOriginalDocxUrl(articleId);
    
    if (!article.originalWordUrl) {
      throw new NotFoundError("Original DOCX not available");
    }

    console.log(`💧 [Adobe] Adding watermark to original DOCX: ${article.originalWordUrl}`);

    try {
      // Generate temporary output path for watermarked file
      const timestamp = Date.now();
      const tempOutputPath = path.join(process.cwd(), 'uploads', 'temp', `original-watermarked-${timestamp}.docx`);
      
      // Use Adobe service for watermarking
      const watermarkedPath = await adobeService.addWatermarkToDocx(
        article.originalWordUrl,
        tempOutputPath,
        watermarkData
      );
      
      // Adobe service now returns relative path, convert to absolute for file reading
      const absoluteWatermarkedPath = path.isAbsolute(watermarkedPath) 
        ? watermarkedPath 
        : path.join(process.cwd(), watermarkedPath.replace(/^\//, ''));
      
      // Read the watermarked file as buffer
      const fs = await import('fs/promises');
      const watermarkedBuffer = await fs.readFile(absoluteWatermarkedPath);
      
      // Clean up temp file
      await fs.unlink(absoluteWatermarkedPath).catch(() => {});
      
      console.log(`✅ [Adobe] Watermark added to original DOCX successfully`);
      return watermarkedBuffer;
    } catch (error) {
      console.error(`❌ [Adobe] Failed to add watermark to original DOCX:`, error);
      
      // Fallback to old watermarking method
      console.log(`🔄 [Fallback] Using local watermarking for original DOCX`);
      const { addSimpleWatermarkToWord } = await import("@/utils/word-watermark.utils.js");
      return await addSimpleWatermarkToWord(article.originalWordUrl, watermarkData);
    }
  }
  
  // NEW: Get editor's DOCX URL (corrected version)
  async getEditorDocxUrl(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { 
        currentWordUrl: true, // This is the editor's corrected DOCX
        title: true,
        contentType: true,
        status: true,
        assignedEditorId: true
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    if (!article.assignedEditorId) {
      throw new NotFoundError("No editor assigned to this article");
    }

    if (!article.currentWordUrl) {
      throw new NotFoundError("Editor's DOCX not available - editor may not have uploaded corrected version yet");
    }

    return article;
  }
  
  // NEW: Download editor's DOCX with watermark using Adobe services
  async downloadEditorDocxWithWatermark(articleId: string, watermarkData: any) {
    const article = await this.getEditorDocxUrl(articleId);
    
    if (!article.currentWordUrl) {
      throw new NotFoundError("Editor's DOCX not available");
    }

    console.log(`💧 [Adobe] Adding watermark to editor's DOCX: ${article.currentWordUrl}`);

    try {
      // Generate temporary output path for watermarked file
      const timestamp = Date.now();
      const tempOutputPath = path.join(process.cwd(), 'uploads', 'temp', `editor-watermarked-${timestamp}.docx`);
      
      // Use Adobe service for watermarking
      const watermarkedPath = await adobeService.addWatermarkToDocx(
        article.currentWordUrl,
        tempOutputPath,
        watermarkData
      );
      
      // Adobe service now returns relative path, convert to absolute for file reading
      const absoluteWatermarkedPath = path.isAbsolute(watermarkedPath) 
        ? watermarkedPath 
        : path.join(process.cwd(), watermarkedPath.replace(/^\//, ''));
      
      // Read the watermarked file as buffer
      const fs = await import('fs/promises');
      const watermarkedBuffer = await fs.readFile(absoluteWatermarkedPath);
      
      // Clean up temp file
      await fs.unlink(absoluteWatermarkedPath).catch(() => {});
      
      console.log(`✅ [Adobe] Watermark added to editor's DOCX successfully`);
      return watermarkedBuffer;
    } catch (error) {
      console.error(`❌ [Adobe] Failed to add watermark to editor's DOCX:`, error);
      
      // Fallback to old watermarking method
      console.log(`🔄 [Fallback] Using local watermarking for editor's DOCX`);
      const { addSimpleWatermarkToWord } = await import("@/utils/word-watermark.utils.js");
      return await addSimpleWatermarkToWord(article.currentWordUrl, watermarkData);
    }
  }
  
  //Download diff as PDF or Word
  async downloadDiff(
    changeLogId: string,
    userId: string,
    userRoles: string[],
    format: "pdf" | "word" = "pdf"
  ) {
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

    if (!isAdmin && !isAssignedEditor) {
      throw new ForbiddenError(
        "You do not have permission to download this diff"
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    const generatedBy = currentUser
      ? `${currentUser.name} (${currentUser.email})`
      : "Unknown User";

    const options = {
      articleTitle: changeLog.article.title,
      versionFrom: changeLog.versionNumber - 1,
      versionTo: changeLog.versionNumber,
      editorName: changeLog.editor?.name,
      generatedBy,
    };

    let buffer: Buffer;
    let filename: string;
    let mimeType: string;

    if (format === "word") {
      console.log(
        `📝 [Diff Word] Generating Word document for change log ${changeLogId}`
      );
      buffer = await generateDiffWord(changeLog.diffData as any, options);
      filename = `diff-v${changeLog.versionNumber}-${changeLog.article.id}.docx`;
      mimeType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      console.log(`✅ [Diff Word] Generated ${buffer.length} bytes`);
    } else {
      console.log(`📄 [Diff PDF] Generating PDF for change log ${changeLogId}`);
      buffer = await generateDiffPdf(changeLog.diffData as any, options);
      filename = `diff-v${changeLog.versionNumber}-${changeLog.article.id}.pdf`;
      mimeType = "application/pdf";
      console.log(`✅ [Diff PDF] Generated ${buffer.length} bytes`);
    }

    return {
      buffer,
      filename,
      mimeType,
    };
  }
  //Download editor's uploaded document with format conversion
  async downloadEditorDocument(
    changeLogId: string,
    userId: string,
    userRoles: string[],
    format: "pdf" | "word" = "pdf"
  ) {
    const changeLog = await prisma.articleChangeLog.findUnique({
      where: { id: changeLogId },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            assignedEditorId: true,
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

    if (!changeLog.editorDocumentUrl) {
      throw new NotFoundError("No editor document uploaded for this version");
    }

    const isAdmin = userRoles.includes("admin");
    const isAssignedEditor = changeLog.article.assignedEditorId === userId;

    if (!isAdmin && !isAssignedEditor) {
      throw new ForbiddenError(
        "Only admins and assigned editors can download editor documents"
      );
    }

    const originalType = changeLog.editorDocumentType?.toLowerCase() || "pdf";
    const requestedFormat = format.toLowerCase();

    console.log(
      `📥 [Editor Doc] Downloading editor document for change log ${changeLogId}`
    );
    console.log(
      `   Original type: ${originalType}, Requested: ${requestedFormat}`
    );

    if (originalType === requestedFormat) {
      console.log(`✅ [Editor Doc] Format matches, returning original file`);

      const filename = `editor-doc-v${changeLog.versionNumber}-${
        changeLog.article.id
      }.${requestedFormat === "word" ? "docx" : "pdf"}`;
      const mimeType =
        requestedFormat === "word"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf";

      return {
        filePath: changeLog.editorDocumentUrl,
        filename,
        mimeType,
        needsConversion: false,
      };
    }

    console.log(
      `🔄 [Editor Doc] Converting from ${originalType} to ${requestedFormat}`
    );

    try {
      const { pdfPath, wordPath } = await ensureBothFormats(
        changeLog.editorDocumentUrl
      );

      const convertedPath = requestedFormat === "pdf" ? pdfPath : wordPath;
      const filename = `editor-doc-v${changeLog.versionNumber}-${
        changeLog.article.id
      }.${requestedFormat === "word" ? "docx" : "pdf"}`;
      const mimeType =
        requestedFormat === "word"
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : "application/pdf";

      console.log(`✅ [Editor Doc] Converted successfully`);

      return {
        filePath: convertedPath,
        filename,
        mimeType,
        needsConversion: true,
      };
    } catch (error) {
      console.error(`❌ [Editor Doc] Conversion failed:`, error);
      throw new BadRequestError(
        `Failed to convert document to ${requestedFormat} format`
      );
    }
  }
  //Generate visual diff PDF with concurrency control
  async generateVisualDiff(changeLogId: string): Promise<string> {
    console.log(
      `🎨 [Visual Diff] Starting generation for change log ${changeLogId}`
    );

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

    if (!changeLog) {
      throw new NotFoundError("Change log not found");
    }

    if (changeLog.visualDiffStatus === "READY" && changeLog.visualDiffUrl) {
      const { resolveUploadPath, fileExists } = await import(
        "@/utils/file-path.utils.js"
      );
      const fullPath = resolveUploadPath(changeLog.visualDiffUrl);

      if (await fileExists(fullPath)) {
        console.log(
          `✅ [Visual Diff] Already exists: ${changeLog.visualDiffUrl}`
        );
        return changeLog.visualDiffUrl;
      } else {
        console.log(`⚠️ [Visual Diff] File missing, resetting status`);
        await prisma.articleChangeLog.update({
          where: { id: changeLogId },
          data: {
            visualDiffStatus: "PENDING",
            visualDiffUrl: null,
          },
        });
      }
    }

    try {
      const updated = await prisma.articleChangeLog.updateMany({
        where: {
          id: changeLogId,
          visualDiffStatus: { in: ["PENDING", "FAILED"] },
        },
        data: { visualDiffStatus: "GENERATING" },
      });

      if (updated.count === 0) {
        console.log(
          `🔒 [Visual Diff] Already being generated by another process`
        );

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const refreshed = await prisma.articleChangeLog.findUnique({
          where: { id: changeLogId },
          select: { visualDiffStatus: true, visualDiffUrl: true },
        });

        if (
          refreshed?.visualDiffStatus === "READY" &&
          refreshed.visualDiffUrl
        ) {
          return refreshed.visualDiffUrl;
        }

        throw new BadRequestError(
          "Visual diff generation in progress, please try again"
        );
      }
    } catch (error) {
      console.error(
        `❌ [Visual Diff] Failed to acquire generation lock:`,
        error
      );
      throw new BadRequestError("Failed to start visual diff generation");
    }

    try {
      if (changeLog.fileType !== "PDF") {
        throw new BadRequestError(
          "Visual diff is only supported for PDF files"
        );
      }

      const {
        generateVisualDiffPath,
        resolveUploadPath,
        ensureDirectoryExists,
      } = await import("@/utils/file-path.utils.js");
      const { generateVisualDiffFromChangeLog } = await import(
        "@/utils/pdf-visual-diff.utils.js"
      );

      const relativePath = generateVisualDiffPath(
        changeLog.article.id,
        changeLog.versionNumber
      );
      const fullPath = resolveUploadPath(relativePath);

      const outputDir = path.dirname(fullPath);
      await ensureDirectoryExists(outputDir);

      console.log(`🎨 [Visual Diff] Generating to: ${relativePath}`);

      await generateVisualDiffFromChangeLog(
        changeLogId,
        changeLog.article.id,
        changeLog.versionNumber,
        changeLog.oldFileUrl,
        changeLog.newFileUrl,
        fullPath
      );

      const fs = await import("fs/promises");

      try {
        await fs.access(fullPath);
        console.log(
          `✅ [Visual Diff] Physical file generated: ${relativePath}`
        );
      } catch {
        throw new Error(`Failed to generate visual diff file at ${fullPath}`);
      }

      await prisma.articleChangeLog.update({
        where: { id: changeLogId },
        data: {
          visualDiffStatus: "READY",
          visualDiffUrl: relativePath,
        },
      });

      console.log(`✅ [Visual Diff] Generated successfully: ${relativePath}`);
      return relativePath;
    } catch (error) {
      console.error(`❌ [Visual Diff] Generation failed:`, error);

      await prisma.articleChangeLog.update({
        where: { id: changeLogId },
        data: { visualDiffStatus: "FAILED" },
      });

      throw new BadRequestError(`Failed to generate visual diff: ${error}`);
    }
  }
}

export const articleDownloadService = new ArticleDownloadService();
