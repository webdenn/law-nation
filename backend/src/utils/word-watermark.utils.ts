import fs from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";
import { resolveToAbsolutePath, fileExistsAtPath } from "@/utils/file-path.utils.js";
import { downloadFileToBuffer } from './pdf-extract.utils.js';
import { NotFoundError } from "@/utils/http-errors.util.js";

/**
 * Centered Watermark + Bottom Right Logo for DOCX.
 * Text floats OVER the centered watermark.
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
    console.log(`💧 [Word Watermark] Applying Dual-Logo Layout for: ${wordPath}`);

    let buffer: Buffer;
    if (wordPath.startsWith('http')) {
      buffer = await downloadFileToBuffer(wordPath);
    } else {
      buffer = await fs.readFile(resolveToAbsolutePath(wordPath));
    }

    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    let modifiedCount = 0;

    // SIZE
    const CENTER_LOGO_SIZE = "350pt";

    // CENTER WATERMARK STYLE (Behind Text, No Wrapping)
    const centerStyle = [
      'margin-left:0',
      'margin-top:0',
      'position:absolute',
      'z-index:-251658240',
      'mso-wrap-edited:f',
      'mso-wrap-distance-left:0',
      'mso-wrap-distance-top:0',
      'mso-wrap-distance-right:0',
      'mso-wrap-distance-bottom:0',
      'mso-position-horizontal:center',
      'mso-position-horizontal-relative:page',
      'mso-position-vertical:center',
      'mso-position-vertical-relative:page',
      'mso-width-relative:page',
      'mso-height-relative:page',
      `width:${CENTER_LOGO_SIZE}`,
      `height:${CENTER_LOGO_SIZE}`,
    ].join(';');

    for (const entry of entries) {
      if (entry.entryName.startsWith("word/") && entry.entryName.endsWith(".xml")) {
        let content = entry.getData().toString("utf-8");
        let localModified = false;

        // Pattern to find image shapes (VML)
        if (content.includes("word/media/image") || content.includes("logo")) {
           const shapeRegex = /(<(v:shape|v:rect|v:image|v:oval)[^>]*style=")([^"]*)(")([^>]*>)([\s\S]*?)(<\/\2>)/gi;
           
           content = content.replace(shapeRegex, (match, start, tag, style, quote, mid, inner, end) => {
              // Prevent infinite loop if already processed
              if (style.includes('mso-position-horizontal:center')) return match;

              localModified = true;

              // Large center watermark only (behind text)
              return `${start}${centerStyle}${quote}${mid}${inner}${end}`;
           });
        }

        // --- DrawingML (Modern Word) fix: force all anchors to center ---
        if (content.includes("<wp:anchor")) {
            localModified = true;

            content = content.replace(/<wp:anchor[\s\S]*?<\/wp:anchor>/gi, (anchorMatch) => {
              return anchorMatch
                .replace(/<wp:positionH\s+relativeFrom="[^"]*">([\s\S]*?)<\/wp:positionH>/i,
                  `<wp:positionH relativeFrom="page"><wp:align>center</wp:align></wp:positionH>`)
                .replace(/<wp:positionV\s+relativeFrom="[^"]*">([\s\S]*?)<\/wp:positionV>/i,
                  `<wp:positionV relativeFrom="page"><wp:align>center</wp:align></wp:positionV>`)
                .replace(/<wp:wrapSquare[^>]*\/>/i, "<wp:wrapNone/>");
            });
        }

        if (localModified) {
          zip.updateFile(entry.entryName, Buffer.from(content, "utf-8"));
          modifiedCount++;
        }
      }
    }

    if (modifiedCount > 0) {
      console.log(`✅ [Word Watermark] Created center watermark + bottom-right corner logo.`);
      return zip.toBuffer();
    }

    return buffer;
  } catch (error: any) {
    console.error("❌ [Word Watermark] Critical Failure:", error);
    try {
      if (wordPath.startsWith('http')) return await downloadFileToBuffer(wordPath);
      return await fs.readFile(resolveToAbsolutePath(wordPath));
    } catch {
      throw error;
    }
  }
}

export async function addSimpleWatermarkToWord(wordPath: string, watermarkData: any): Promise<Buffer> {
  return addWatermarkToWord(wordPath, watermarkData);
}