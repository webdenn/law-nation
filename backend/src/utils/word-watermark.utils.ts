import fs from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";
import { resolveToAbsolutePath, fileExistsAtPath } from "@/utils/file-path.utils.js";
import { downloadFileToBuffer } from './pdf-extract.utils.js';
import { NotFoundError } from "@/utils/http-errors.util.js";

/**
 * Dynamically cleans giant watermarks and ensures a small logo in DOCX buffers.
 * This works on-the-fly for both old and new articles.
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
    console.log(`💧 [Word Watermark] Dynamic cleaning for: ${wordPath}`);

    let buffer: Buffer;
    if (wordPath.startsWith('http')) {
      buffer = await downloadFileToBuffer(wordPath);
    } else {
      buffer = await fs.readFile(resolveToAbsolutePath(wordPath));
    }

    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    let modified = false;

    for (const entry of entries) {
      if (entry.entryName.startsWith("word/header") && entry.entryName.endsWith(".xml")) {
        let content = entry.getData().toString("utf-8");

        // 1. Agressively target large watermarks in headers
        // Word watermarks are typically <v:shape> with a "position:absolute" and large dimensions.
        // We look for styles that indicate a giant logo (e.g. width/height in hundreds of points)
        
        // Pattern to find v:shape tags used for watermarking
        // We look for those that have specific attributes often found in watermarks or our current large logo
        const shapeRegex = /<v:shape[^>]*style="[^"]*width:(\d+\.?\d*)pt;height:(\d+\.?\d*)pt[^"]*"[^>]*>([\s\S]*?)<\/v:shape>/g;
        
        const newContent = content.replace(shapeRegex, (match, width, height, inner) => {
          const w = parseFloat(width);
          const h = parseFloat(height);
          
          // If the logo is huge (greater than 100pt width/height), shrink it to ~50pt
          if (w > 100 || h > 100) {
            console.log(`📏 [Word Watermark] Shrinking giant logo from ${w}x${h} to 50x50`);
            modified = true;
            // Maintain aspect ratio approximately or force small square
            const scale = Math.min(50/w, 50/h);
            const newW = (w * scale).toFixed(2);
            const newH = (h * scale).toFixed(2);
            
            return match.replace(`width:${width}pt;height:${height}pt`, `width:${newW}pt;height:${newH}pt`);
          }
          return match;
        });

        // 2. Also look for <w:pict> blocks that might contain the logo
        if (content !== newContent) {
          zip.updateFile(entry.entryName, Buffer.from(newContent, "utf-8"));
          content = newContent;
        }
      }
    }

    if (modified) {
      console.log(`✅ [Word Watermark] Logo resized to small successfully.`);
      return zip.toBuffer();
    }

    console.log(`📄 [Word Watermark] No giant logo found or already small. Returning clean copy.`);
    return buffer;
  } catch (error: any) {
    console.error("❌ [Word Watermark] Dynamic processing failed:", error);
    // Fallback to original buffer to prevent download failure
    try {
      if (wordPath.startsWith('http')) return await downloadFileToBuffer(wordPath);
      return await fs.readFile(resolveToAbsolutePath(wordPath));
    } catch {
      throw error;
    }
  }
}

/**
 * Fallback / Legacy support
 */
export async function addSimpleWatermarkToWord(
  wordPath: string,
  watermarkData: any
): Promise<Buffer> {
  return addWatermarkToWord(wordPath, watermarkData);
}
