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

        // 1. Target large watermarks in headers robustly
        // Word watermarks are typically <v:shape> with a style attribute.
        // We look for any element with a style that has large width/height.
        
        const styleRegex = /style="([^"]*)"/gi;
        const newContent = content.replace(styleRegex, (match, style) => {
          let newStyle = style;
          let styleModified = false;

          // Resize width if huge (>100pt or equivalent)
          newStyle = newStyle.replace(/(width)\s*:\s*(\d+\.?\d*)\s*(pt|in|px|cm|mm)/gi, (m, prop, val, unit) => {
            const v = parseFloat(val);
            if ((unit === 'pt' && v > 100) || (unit === 'in' && v > 1.3) || (unit === 'px' && v > 140)) {
              styleModified = true;
              modified = true;
              const newVal = unit === 'in' ? '0.7' : (unit === 'px' ? '70' : '50');
              console.log(`📏 [Word Watermark] Resizing giant ${prop}: ${val}${unit} -> ${newVal}${unit}`);
              return `${prop}:${newVal}${unit}`;
            }
            return m;
          });

          // Resize height if huge (>100pt or equivalent)
          newStyle = newStyle.replace(/(height)\s*:\s*(\d+\.?\d*)\s*(pt|in|px|cm|mm)/gi, (m, prop, val, unit) => {
            const v = parseFloat(val);
            if ((unit === 'pt' && v > 100) || (unit === 'in' && v > 1.3) || (unit === 'px' && v > 140)) {
              styleModified = true;
              modified = true;
              const newVal = unit === 'in' ? '0.7' : (unit === 'px' ? '70' : '50');
              console.log(`📏 [Word Watermark] Resizing giant ${prop}: ${val}${unit} -> ${newVal}${unit}`);
              return `${prop}:${newVal}${unit}`;
            }
            return m;
          });

          return styleModified ? `style="${newStyle}"` : match;
        });

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
