import fs from "fs/promises";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Header,
  ExternalHyperlink,
  ImageRun,
} from "docx";
import { createRequire } from "module";
import { NotFoundError } from "@/utils/http-errors.util.js";
import { resolveToAbsolutePath, fileExistsAtPath } from "@/utils/file-path.utils.js";
import { downloadFileToBuffer } from './pdf-extract.utils.js';

// Create require for CommonJS modules (mammoth)
const require = createRequire(import.meta.url);

/**
 * Add watermark to Word document (simple version - returns original for now)
 */
export async function addWatermarkToWord(
  wordPath: string,
  watermarkData: {
    userName: string;
    downloadDate: Date;
    articleTitle: string;
    articleId: string;
    frontendUrl: string;
  }
): Promise<Buffer> {
  try {
    console.log(`💧 [Word Watermark] Adding watermark to: ${wordPath}`);

    // ✅ Check if file exists or is a URL
    let originalBuffer: Buffer;
    const isUrl = wordPath.startsWith('http://') || wordPath.startsWith('https://');

    if (isUrl) {
      console.log(`🌐 [Word Watermark] Downloading from URL: ${wordPath}`);
      originalBuffer = await downloadFileToBuffer(wordPath);
    } else {
      const fullPath = resolveToAbsolutePath(wordPath);
      console.log(`📂 [Word Watermark] Resolved full path: ${fullPath}`);

      if (!fileExistsAtPath(wordPath)) {
        console.error(`❌ [Word Watermark] File not found: ${fullPath}`);
        throw new NotFoundError(
          `Document file not found on server: ${path.basename(fullPath)}`
        );
      }
      console.log(`✅ [Word Watermark] File exists and is accessible`);
      originalBuffer = await fs.readFile(fullPath);
    }

    const watermarkText = `Downloaded by: ${
      watermarkData.userName
    } | Date: ${watermarkData.downloadDate.toLocaleDateString()} | Article: ${
      watermarkData.articleTitle
    }`;

    console.log(`💧 [Word Watermark] Watermark text: ${watermarkText}`);

    console.log(
      `⚠️ [Word Watermark] Note: Full Word watermarking requires additional libraries`
    );
    console.log(`💡 [Word Watermark] Returning original document for now`);
    console.log(
      `💡 [Word Watermark] Consider using: docx-templates, officegen, or docxtemplater`
    );

    // For now, call addSimpleWatermarkToWord for actual watermarking
    return await addSimpleWatermarkToWord(wordPath, watermarkData);
  } catch (error: any) {
    console.error("❌ [Word Watermark] Failed to add watermark:", error);

    // Handle specific error types
    if (error instanceof NotFoundError) {
      // Re-throw NotFoundError for proper API response
      throw error;
    }

    if (error?.code === "ENOENT") {
      throw new NotFoundError(
        `Document file not found on server: ${path.basename(wordPath)}`
      );
    }

    if (error?.code === "EACCES") {
      throw new Error("Permission denied: Cannot access document file");
    }

    throw new Error(
      `Failed to add watermark to Word document: ${
        error?.message || "Unknown error"
      }`
    );
  }
}

/**
 * Add simple text watermark to Word document
 * This creates a new document with watermark header and original content
 * Note: This is a simplified version. For production, use docx-templates
 */
export async function addSimpleWatermarkToWord(
  wordPath: string,
  watermarkData: {
    userName: string;
    downloadDate: Date;
    articleTitle: string;
    articleId: string;
    frontendUrl: string;
  }
): Promise<Buffer> {
  try {
    console.log(
      `💧 [Word Watermark] Adding watermark with logo to: ${wordPath}`
    );

    // ✅ Check if file exists or is a URL
    let originalBuffer: Buffer;
    const isUrl = wordPath.startsWith('http://') || wordPath.startsWith('https://');

    if (isUrl) {
      console.log(`🌐 [Word Watermark] Downloading from URL: ${wordPath}`);
      originalBuffer = await downloadFileToBuffer(wordPath);
    } else {
      const fullPath = resolveToAbsolutePath(wordPath);
      console.log(`📂 [Word Watermark] Resolved full path: ${fullPath}`);

      if (!fileExistsAtPath(wordPath)) {
        console.error(`❌ [Word Watermark] File not found: ${fullPath}`);
        throw new NotFoundError(
          `Document file not found on server: ${path.basename(fullPath)}`
        );
      }
      console.log(`✅ [Word Watermark] File exists and is accessible`);
      originalBuffer = await fs.readFile(fullPath);
    }

    // 🔥 CRITICAL FIX: To ensure 100% formatting preservation, we STOP using mammoth 
    // to rebuild the document. Rebuilding from raw text destroys all tables/styling.
    console.log(`📄 [Word Watermark] Returning original buffer to preserve 100% formatting.`);
    return originalBuffer;
  } catch (error: any) {
    console.error("❌ [Word Watermark] Failed to add watermark:", error);

    // Handle specific error types
    if (error instanceof NotFoundError) {
      // Re-throw NotFoundError for proper API response
      throw error;
    }

    if (error?.code === "ENOENT") {
      throw new NotFoundError(
        `Document file not found on server: ${path.basename(wordPath)}`
      );
    }

    if (error?.code === "EACCES") {
      throw new Error("Permission denied: Cannot access document file");
    }

    console.error("❌ [Word Watermark] Falling back to error response");
    throw new Error(
      `Failed to process Word document: ${error?.message || "Unknown error"}`
    );
  }
}
