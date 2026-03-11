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
    console.log(`💧 [Word Watermark] Ultra-Robust cleaning/resizing for: ${wordPath}`);

    let buffer: Buffer;
    if (wordPath.startsWith('http')) {
      buffer = await downloadFileToBuffer(wordPath);
    } else {
      buffer = await fs.readFile(resolveToAbsolutePath(wordPath));
    }

    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    let modifiedCount = 0;

    // SETTING BOTH TO SAME SIZE AS REQUESTED
    const CENTER_LOGO_SIZE = "80pt"; 
    const CORNER_LOGO_SIZE = "80pt";

    for (const entry of entries) {
      if (entry.entryName.startsWith("word/") && entry.entryName.endsWith(".xml")) {
        let content = entry.getData().toString("utf-8");
        let localModified = false;

        // --- STEP 1: Fix existing Giant/Misplaced Logos (Old Articles) ---
        const styleRegex = /style="([^"]*)"/gi;
        content = content.replace(styleRegex, (match, style) => {
          let newStyle = style;
          let styleModified = false;

          // Detect giant dimensions
          const dimRegex = /(width|height)\s*:\s*(\d+\.?\d*)\s*(pt|in|px|cm|mm|)/gi;
          newStyle = newStyle.replace(dimRegex, (m, prop, val, unit) => {
            const v = parseFloat(val);
            let isGiant = false;
            
            if (unit === 'pt' && v > 120) isGiant = true;
            else if (unit === 'in' && v > 1.6) isGiant = true;
            else if (unit === 'px' && v > 160) isGiant = true;
            else if (unit === 'cm' && v > 4.2) isGiant = true;
            else if (unit === 'mm' && v > 42) isGiant = true;
            else if (!unit && v > 1000) isGiant = true;

            if (isGiant) {
              styleModified = true;
              localModified = true;
              // Return standard size
              return `${prop}:${CENTER_LOGO_SIZE}`;
            }
            return m;
          });

          // FORCE Centering if it was a giant logo or it's positioned absolutely
          if (styleModified || (style.includes('position:absolute') && !style.includes('mso-position-horizontal:right'))) {
             // Wipe out old positioning
             newStyle = newStyle.replace(/margin-(top|left|right|bottom):[^;]*/g, 'margin-$1:0pt');
             
             // Inject bulletproof centering
             const centeringAttributes = [
               'position:absolute',
               `width:${CENTER_LOGO_SIZE}`,
               `height:${CENTER_LOGO_SIZE}`,
               'mso-position-horizontal:center',
               'mso-position-horizontal-relative:page',
               'mso-position-vertical:center',
               'mso-position-vertical-relative:page',
               'z-index:251658240'
             ];

             // Merge into style
             centeringAttributes.forEach(attr => {
                const key = attr.split(':')[0];
                if (newStyle.includes(key)) {
                   const regex = new RegExp(`${key}:[^;]*`, 'g');
                   newStyle = newStyle.replace(regex, attr);
                } else {
                   newStyle += ';' + attr;
                }
             });
             styleModified = true;
             localModified = true;
          }

          return styleModified ? `style="${newStyle}"` : match;
        });

        // --- STEP 2: Dual Logo Injection for Articles with identifiable keywords ---
        if (content.includes("LAW NATION") || content.includes("PRIME TIMES") || content.includes("logo") || content.includes("watermark") || content.includes("word/media/image")) {
           const genericShapeRegex = /(<(v:shape|v:rect|v:image|v:oval)[^>]*style=")([^"]*)(")([^>]*>)([\s\S]*?)(<\/\2>)/gi;
           content = content.replace(genericShapeRegex, (match, start, tag, style, quote, mid, inner, end) => {
              // Avoid re-processing if already applied our precise size
              if (style.includes(`width:${CENTER_LOGO_SIZE}`) && style.includes('mso-position-horizontal:center')) {
                return match;
              }

              if (match.includes("relative:page") || style.includes("width:") || match.includes("image")) {
                console.log(`🎯 [Word Watermark] Injecting Dual-Logo centered pattern in ${entry.entryName}`);
                localModified = true;
                
                const centerStyle = `position:absolute;width:${CENTER_LOGO_SIZE};height:${CENTER_LOGO_SIZE};z-index:251658240;mso-position-horizontal:center;mso-position-horizontal-relative:page;mso-position-vertical:center;mso-position-vertical-relative:page`;
                const centerLogo = `${start}${centerStyle}${quote}${mid}${inner}${end}`;

                const cornerStyle = `position:absolute;width:${CORNER_LOGO_SIZE};height:${CORNER_LOGO_SIZE};z-index:251658239;mso-position-horizontal:right;mso-position-horizontal-relative:margin;mso-position-vertical:bottom;mso-position-vertical-relative:margin`;
                const cornerLogo = `${start}${cornerStyle}${quote}${mid}${inner}${end}`;

                return centerLogo + cornerLogo;
              }
              return match;
           });
        }

        // --- STEP 3: Fallback for DrawingML (EMU units) ---
        const drawingMLRegex = /<(wp:extent|a:ext)\s+cx="(\d+)"\s+cy="(\d+)"([^>]*?)(\/?>)/gi;
        content = content.replace(drawingMLRegex, (match, tag, cx, cy, otherAttrs, closing) => {
           const valCx = parseInt(cx);
           const valCy = parseInt(cy);
           if (valCx > 1500000 || valCy > 1500000) { 
              console.log(`📐 [Word Watermark] Resizing giant DrawingML ${tag} in ${entry.entryName}`);
              localModified = true;
              // 1828800 EMU ≈ 2 inches ≈ 144pt
              const newCx = 1828800; 
              const newCy = Math.round(valCy * (newCx / valCx));
              return `<${tag} cx="${newCx}" cy="${newCy}"${otherAttrs}${closing}`;
           }
           return match;
        });

        if (localModified) {
          zip.updateFile(entry.entryName, Buffer.from(content, "utf-8"));
          modifiedCount++;
        }
      }
    }

    if (modifiedCount > 0) {
      console.log(`✅ [Word Watermark] ${modifiedCount} XML files cleaned/centered successfully.`);
      return zip.toBuffer();
    }

    console.log(`📄 [Word Watermark] No identifiable watermark found to transform. Returning original.`);
    return buffer;
  } catch (error: any) {
    console.error("❌ [Word Watermark] Failed to process document:", error);
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
