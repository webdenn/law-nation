import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import { PDFDocument, PDFName, PDFDict } from "pdf-lib";
import AdmZip from "adm-zip";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";
const isLocal = process.env.NODE_ENV === "local";

// ─── WATERMARK CONSTANTS ─────────────────────────────────────────────────────
const CENTER_SIZE = "350pt"; 
const BOTTOM_SIZE = "75pt";
const OPACITY_VAL = "0.15"; // User side jaisi same opacity (15%)

function extractS3Key(url: string | null): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;
  } catch { return null; }
}

// ─── DOCX CLEANER (Stage 1 & 2 Fix with Unique IDs) ──────────────────────────
function cleanDocxBuffer(buffer: Buffer): Buffer {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    let changed = false;

    for (const entry of zipEntries) {
      if (!entry.entryName.startsWith("word/") || !entry.entryName.endsWith(".xml")) continue;

      let content = entry.getData().toString("utf-8");
      let localModified = false;

      // --- VML Logic: Unique ID injection for Center + Bottom ---
      const vmlRegex = /(<(v:shape|v:rect|v:image|v:oval)[^>]*style=")([^"]*)(")([^>]*>)([\s\S]*?)(<\/\2>)/gi;
      
      if (content.includes("v:shape") || content.includes("word/media/image")) {
        let counter = 0;
        content = content.replace(vmlRegex, (match, start, tag, style, quote, mid, inner, end) => {
          if (style.includes("fixed-wm")) return match;
          
          localModified = true;
          counter++;

          // 1. CENTER WATERMARK
          // Unique ID taaki Word dono logos ko alag samjhe
          let centerStart = start.replace(/id="[^"]*"/i, `id="wm_center_${counter}"`);
          const centerStyle = `position:absolute;width:${CENTER_SIZE};height:${CENTER_SIZE};z-index:-251658240;mso-position-horizontal:center;mso-position-horizontal-relative:page;mso-position-vertical:center;mso-position-vertical-relative:page;opacity:${OPACITY_VAL};filter:alpha(opacity=${parseFloat(OPACITY_VAL)*100});fixed-wm:yes;`;
          const centerLogo = `${centerStart}${centerStyle}${quote}${mid}${inner}${end}`;

          // 2. BOTTOM RIGHT LOGO
          let bottomStart = start.replace(/id="[^"]*"/i, `id="wm_bottom_${counter}"`);
          const bottomStyle = `position:absolute;width:${BOTTOM_SIZE};height:${BOTTOM_SIZE};z-index:251659264;mso-position-horizontal:right;mso-position-horizontal-relative:margin;mso-position-vertical:bottom;mso-position-vertical-relative:margin;opacity:1;fixed-wm:yes;`;
          const bottomLogo = `${bottomStart}${bottomStyle}${quote}${mid}${inner}${end}`;

          return centerLogo + bottomLogo;
        });
      }

      // --- DrawingML (Modern) Fix ---
      if (content.includes("<wp:anchor")) {
        localModified = true;
        content = content.replace(/<wp:positionH[^>]*>[\s\S]*?<\/wp:positionH>/gi, 
          `<wp:positionH relativeFrom="page"><wp:align>center</wp:align></wp:positionH>`);
        content = content.replace(/<wp:positionV[^>]*>[\s\S]*?<\/wp:positionV>/gi, 
          `<wp:positionV relativeFrom="page"><wp:align>center</wp:align></wp:positionV>`);
        
        if (!content.includes("<wp:wrapNone/>")) {
          content = content.replace(/<wp:wrapSquare[^>]*\/>/gi, "<wp:wrapNone/>");
        }
      }

      if (localModified) {
        zip.updateFile(entry.entryName, Buffer.from(content, "utf-8"));
        changed = true;
      }
    }
    return changed ? zip.toBuffer() : buffer;
  } catch (err: any) {
    console.error("⚠️ DOCX fix failed:", err.message);
    return buffer;
  }
}

// ─── MAIN FUNCTION ───────────────────────────────────────────────────────────
async function reWatermarkArticles() {
  console.log("🚀 [Re-Watermark v14] Final Fix: Opacity + Bottom Logo");
  const s3Client = isLocal ? null : new S3Client({ region: AWS_REGION });

  try {
    const articles = await prisma.article.findMany();
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`[${i+1}/${articles.length}] ${article.title}`);

      try {
        const wordUrl = article.originalWordUrl || article.currentWordUrl;
        if (wordUrl) {
          const wordBuffer = await downloadFileToBuffer(wordUrl);
          const cleanWord = cleanDocxBuffer(wordBuffer);
          const key = extractS3Key(article.currentWordUrl);
          if (s3Client && key) {
            await s3Client.send(new PutObjectCommand({
              Bucket: S3_BUCKET_ARTICLES,
              Key: key,
              Body: cleanWord,
              ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            }));
          }
        }
        console.log("   ✅ DOCX Fixed");
      } catch (err: any) {
        console.error(`   ❌ Failed: ${err.message}`);
      }
    }
  } catch (e) { console.error(e); } finally { process.exit(0); }
}

reWatermarkArticles();