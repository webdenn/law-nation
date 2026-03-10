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
    console.log(`💧 [Word Watermark] Ultra-Aggressive cleaning/resizing for: ${wordPath}`);

    let buffer: Buffer;
    if (wordPath.startsWith('http')) {
      buffer = await downloadFileToBuffer(wordPath);
    } else {
      buffer = await fs.readFile(resolveToAbsolutePath(wordPath));
    }

    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    let modifiedCount = 0;

    for (const entry of entries) {
      // Check ALL XML files in the word/ directory (headers, footers, document, etc.)
      if (entry.entryName.startsWith("word/") && entry.entryName.endsWith(".xml")) {
        let content = entry.getData().toString("utf-8");
        let localModified = false;

        // 1. NUKE elements that are clearly giant watermarks
        // We look for v:shape, v:rect, v:image, w:pict, w:drawing
        
        // Strategy A: Replace huge styles
        const styleRegex = /style="([^"]*)"/gi;
        content = content.replace(styleRegex, (match, style) => {
          let newStyle = style;
          let styleModified = false;

          // Target both width and height with any units (pt, in, px, cm, mm) or just numbers
          const dimRegex = /(width|height)\s*:\s*(\d+\.?\d*)\s*(pt|in|px|cm|mm|)/gi;
          
          newStyle = newStyle.replace(dimRegex, (m, prop, val, unit) => {
            const v = parseFloat(val);
            let isGiant = false;
            
            // Heuristics for "Giant"
            if (unit === 'pt' && v > 100) isGiant = true;
            else if (unit === 'in' && v > 1.3) isGiant = true;
            else if (unit === 'px' && v > 140) isGiant = true;
            else if (unit === 'cm' && v > 3.5) isGiant = true;
            else if (unit === 'mm' && v > 35) isGiant = true;
            else if (!unit && v > 1000) isGiant = true; // Relative units or raw EMU

            if (isGiant) {
              const newVal = unit === 'in' ? '0.6' : (unit === 'px' ? '60' : (unit === 'cm' ? '1.5' : (unit === 'mm' ? '15' : '40')));
              console.log(`📏 [Word Watermark] Found giant ${prop} in ${entry.entryName}: ${val}${unit}. Shrinking to ${newVal}${unit}`);
              styleModified = true;
              localModified = true;
              return `${prop}:${newVal}${unit}`;
            }
            return m;
          });

          // Special case for watermarks: they often have position:absolute and z-index:-... 
          // If we see a giant shape, we might also want to force it to top-left or something
          if (styleModified && style.includes('position:absolute')) {
             newStyle = newStyle.replace(/mso-position-vertical-relative:[^;]*/g, 'mso-position-vertical-relative:margin');
             newStyle = newStyle.replace(/mso-position-horizontal-relative:[^;]*/g, 'mso-position-horizontal-relative:margin');
             // Move to top leftish area
             if (!newStyle.includes('margin-top')) newStyle += ';margin-top:20pt;margin-left:20pt';
          }

          return styleModified ? `style="${newStyle}"` : match;
        });

        // Strategy B: If content includes "LAW NATION" or "PRIME TIMES", and it's a shape/image, resize it.
        if (content.includes("LAW NATION") || content.includes("PRIME TIMES")) {
           // Improved regex to capture the full opening tag and keep it safe
           const genericShapeRegex = /(<(?:v:shape|v:rect|v:image|v:oval)[^>]*style=")([^"]*)(")/gi;
           content = content.replace(genericShapeRegex, (match, start, style, end) => {
              // Only apply if it's actually large or part of a watermark structure
              if (match.includes("mso-position-vertical-relative:page") || style.includes("width:") && !style.includes('width:60pt')) {
                console.log(`🎯 [Word Watermark] Resizing logo style in ${entry.entryName} (matched via text-context)`);
                localModified = true;
                const newStyle = "position:absolute;margin-left:20pt;margin-top:20pt;width:60pt;height:60pt;z-index:251658240;mso-position-horizontal:absolute;mso-position-horizontal-relative:margin;mso-position-vertical:absolute;mso-position-vertical-relative:margin";
                return `${start}${newStyle}${end}`;
              }
              return match;
           });
        }

        // Strategy C: Target elements that are background-relative or page-relative
        if (content.includes('mso-position-vertical-relative:page') || content.includes('mso-position-horizontal-relative:page')) {
           const pageRelativeRegex = /(<(?:v:shape|v:rect|v:image|v:oval)[^>]*style=")([^"]*width\s*:\s*\d+\.?\d*(?:pt|in|px|cm|mm|)[^"]*)(")/gi;
           content = content.replace(pageRelativeRegex, (match, start, style, end) => {
              if ((style.includes('relative:page') || style.includes('width:100%') || style.includes('height:100%')) && !style.includes('width:65pt')) {
                console.log(`📡 [Word Watermark] Shrinking page-relative element in ${entry.entryName}`);
                localModified = true;
                const smallStyle = "position:absolute;margin-left:20pt;margin-top:20pt;width:65pt;height:65pt;z-index:251658240;mso-position-horizontal:absolute;mso-position-horizontal-relative:margin;mso-position-vertical:absolute;mso-position-vertical-relative:margin";
                return `${start}${smallStyle}${end}`;
              }
              return match;
           });
        }

        // Strategy D: Target DrawingML (EMU units) - CRITICAL FIX for XML tag closure
        const drawingMLRegex = /<(wp:extent|a:ext)\s+cx="(\d+)"\s+cy="(\d+)"([^>]*?)(\/?>)/gi;
        content = content.replace(drawingMLRegex, (match, tag, cx, cy, otherAttrs, closing) => {
           const valCx = parseInt(cx);
           const valCy = parseInt(cy);
           if (valCx > 1000000 || valCy > 1000000) {
              console.log(`📐 [Word Watermark] Shrinking giant DrawingML ${tag} in ${entry.entryName}: ${cx}x${cy} EMUs`);
              localModified = true;
              const newCx = 640080; // ~0.7 inch
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
      console.log(`✅ [Word Watermark] ${modifiedCount} XML files cleaned/resized successfully.`);
      return zip.toBuffer();
    }

    console.log(`📄 [Word Watermark] No giant logo detected in headers or body. Returning original.`);
    return buffer;
  } catch (error: any) {
    console.error("❌ [Word Watermark] Ultimate cleaning failed:", error);
    // Fallback to original buffer
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
