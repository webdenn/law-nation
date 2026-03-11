import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import { PDFDocument, PDFName, PDFDict, PDFRef, PDFStream, PDFRawStream } from "pdf-lib";
import AdmZip from "adm-zip";

/**
 * RE-WATERMARK SCRIPT v13: STAGE 1 & 2 FIX
 * - Fixed: Center Watermark + Bottom Right Logo for DOCX
 * - Fixed: Transparency for center watermark (0.12 opacity)
 * - Fixed: PDF scrubbing logic remains for clean visuals
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";
const isLocal = process.env.NODE_ENV === "local";

// ─── WATERMARK SIZE CONSTANTS ─────────────────────────────────────────────────
const CENTER_SIZE_PT = "350pt"; 
const BOTTOM_SIZE_PT = "75pt";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function extractS3Key(url: string | null): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;
  } catch { return null; }
}

// ─── PDF CLEANER (Aggrssive Scrubbing) ───────────────────────────────────────
async function aggressivelyCleanPdf(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  pdfDoc.catalog.delete(PDFName.of("OCProperties"));
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    page.node.delete(PDFName.of("Annots"));
    const resources = page.node.get(PDFName.of("Resources"));
    if (resources instanceof PDFDict) {
      resources.delete(PDFName.of("XObject"));
      resources.delete(PDFName.of("Pattern"));
      resources.delete(PDFName.of("ExtGState"));
    }
  }
  return Buffer.from(await pdfDoc.save());
}

// ─── DOCX CLEANER (Stage 1 & 2 Center + Bottom Fix) ──────────────────────────
function cleanDocxBuffer(buffer: Buffer): Buffer {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    let changed = false;

    for (const entry of zipEntries) {
      if (!entry.entryName.startsWith("word/") || !entry.entryName.endsWith(".xml")) continue;

      let content = entry.getData().toString("utf-8");
      let localModified = false;

      // --- STRATEGY 1: VML Shapes (Legacy/Stages) ---
      // Hum har image/shape ko Center Watermark + Bottom Logo mein convert karenge
      const vmlRegex = /(<(v:shape|v:rect|v:image|v:oval)[^>]*style=")([^"]*)(")([^>]*>)([\s\S]*?)(<\/\2>)/gi;
      
      if (content.includes("v:shape") || content.includes("word/media/image")) {
        content = content.replace(vmlRegex, (match, start, tag, style, quote, mid, inner, end) => {
          if (style.includes("processed-wm")) return match;

          localModified = true;
          // Center Watermark Style
          const centerStyle = `position:absolute;width:${CENTER_SIZE_PT};height:${CENTER_SIZE_PT};z-index:-251658240;mso-position-horizontal:center;mso-position-horizontal-relative:page;mso-position-vertical:center;mso-position-vertical-relative:page;opacity:0.12;filter:alpha(opacity=12);processed-wm:yes;`;
          const centerLogo = `${start}${centerStyle}${quote}${mid}${inner}${end}`;

          // Bottom Right Logo Style
          const bottomStyle = `position:absolute;width:${BOTTOM_SIZE_PT};height:${BOTTOM_SIZE_PT};z-index:251659264;mso-position-horizontal:right;mso-position-horizontal-relative:margin;mso-position-vertical:bottom;mso-position-vertical-relative:margin;processed-wm:yes;`;
          const bottomLogo = `${start}${bottomStyle}${quote}${mid}${inner}${end}`;

          return centerLogo + bottomLogo;
        });
      }

      // --- STRATEGY 2: DrawingML (Modern Word) Positioning ---
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
    console.error("⚠️ DOCX cleaning failed:", err.message);
    return buffer;
  }
}

// ─── MAIN EXECUTION ──────────────────────────────────────────────────────────
async function reWatermarkArticles() {
  console.log("🚀 [Re-Watermark v13] STAGE 1 & 2 FIX — Center + Bottom");

  const s3Client = isLocal ? null : new S3Client({ region: AWS_REGION });

  try {
    const articles = await prisma.article.findMany();
    console.log(`📊 Total Articles: ${articles.length}`);

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`[${i + 1}/${articles.length}] Processing: ${article.title}`);

      try {
        // PDF Handling
        const pdfUrl = article.originalPdfUrl || article.currentPdfUrl;
        if (pdfUrl) {
          const pdfBuffer = await downloadFileToBuffer(pdfUrl);
          const cleanPdf = await aggressivelyCleanPdf(pdfBuffer);
          const key = extractS3Key(article.currentPdfUrl);
          if (s3Client && key) {
            await s3Client.send(new PutObjectCommand({
              Bucket: S3_BUCKET_ARTICLES,
              Key: key,
              Body: cleanPdf,
              ContentType: "application/pdf",
            }));
          }
        }

        // DOCX Handling (Stage Fix Applied Here)
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
        console.log("   ✅ Success");
      } catch (err: any) {
        console.error(`   ❌ Failed: ${err.message}`);
      }
    }
  } catch (error: any) {
    console.error("Fatal:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

reWatermarkArticles();