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

    // SIZES
    const CENTER_LOGO_SIZE = "350pt"; 
    const CORNER_LOGO_SIZE = "70pt";

    // 1. CENTER WATERMARK STYLE (Behind Text, No Wrapping)
    const centerStyle = [
      'position:absolute',
      'margin-left:0',
      'margin-top:0',
      `width:${CENTER_LOGO_SIZE}`,
      `height:${CENTER_LOGO_SIZE}`,
      'z-index:-251658240', // Negative so text is on top
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
      'mso-height-relative:page'
    ].join(';');

    // 2. BOTTOM RIGHT LOGO STYLE
    const cornerStyle = [
      'position:absolute',
      `width:${CORNER_LOGO_SIZE}`,
      `height:${CORNER_LOGO_SIZE}`,
      'z-index:251659264',
      'mso-position-horizontal:right',
      'mso-position-horizontal-relative:margin',
      'mso-position-vertical:bottom',
      'mso-position-vertical-relative:margin'
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
              
              // Injection: 1 Center Watermark + 1 Bottom Right Logo
              const centerWatermark = `${start}${centerStyle}${quote}${mid}${inner}${end}`;
              const cornerLogo = `${start}${cornerStyle}${quote}${mid}${inner}${end}`;

              return centerWatermark + cornerLogo;
           });
        }

        // --- DrawingML (Modern Word) Fix for centering ---
        if (content.includes("<wp:anchor")) {
            localModified = true;
            // Force center alignment for modern XML containers
            content = content.replace(/<wp:positionH\s+relativeFrom="[^"]*">([\s\S]*?)<\/wp:positionH>/gi, 
              `<wp:positionH relativeFrom="page"><wp:align>center</wp:align></wp:positionH>`);
            content = content.replace(/<wp:positionV\s+relativeFrom="[^"]*">([\s\S]*?)<\/wp:positionV>/gi, 
              `<wp:positionV relativeFrom="page"><wp:align>center</wp:align></wp:positionV>`);
            
            // Ensure "Behind Text" wrapping for the center logo
            if (!content.includes("<wp:wrapNone/>")) {
                content = content.replace(/<wp:wrapSquare[^>]*\/>/gi, "<wp:wrapNone/>");
            }
        }

        if (localModified) {
          zip.updateFile(entry.entryName, Buffer.from(content, "utf-8"));
          modifiedCount++;
        }
      }
    }

    if (modifiedCount > 0) {
      console.log(`✅ [Word Watermark] Created center-behind layout with bottom-right logo.`);
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