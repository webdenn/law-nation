import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import { PDFDocument, PDFName, PDFDict, PDFRef, PDFStream, PDFRawStream } from "pdf-lib";
import AdmZip from "adm-zip";

// ─── CONFIG ─────────────────────────────────────────────────────────
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";
const isLocal = process.env.NODE_ENV === "local";

// ─── WATERMARK SETTINGS ─────────────────────────────────────────────
const WM_CENTER_SIZE = "350pt";
const WM_BOTTOM_SIZE = "85pt";
const WM_OPACITY = "0.10";

// ─── PDF CLEANER (Fixes 2025 Overlap) ───────────────────────────────
async function aggressivelyCleanPdf(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    ignoreEncryption: true,
    throwOnInvalidObject: false,
  });

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

    try {
      const contents = page.node.get(PDFName.of("Contents"));
      if (contents) {
        const contentRefs = Array.isArray(contents) ? contents : [contents];
        for (const ref of contentRefs) {
          const stream = pdfDoc.context.lookup(ref as PDFRef);
          if (stream instanceof PDFRawStream || stream instanceof PDFStream) {
            let text = Buffer.from((stream as any).contents).toString("latin1");
            const doRegex = /\/[A-Za-z0-9]+\s+Do/g;
            if (doRegex.test(text)) {
              text = text.replace(doRegex, "");
              (stream as any).contents = Buffer.from(text, "latin1");
            }
          }
        }
      }
    } catch (_) {}
  }

  return Buffer.from(await pdfDoc.save());
}

// ─── DOCX FIX ENGINE (v19: Single Center + Solid Bottom) ─────────────
function cleanDocxBuffer(buffer: Buffer): Buffer {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    let changed = false;

    for (const entry of zipEntries) {
      if (!entry.entryName.startsWith("word/") || !entry.entryName.endsWith(".xml"))
        continue;

      let content = entry.getData().toString("utf-8");
      let localModified = false;

      // 1. Wipe out any existing modern anchors (DrawingML) to prevent extra logos
      if (content.includes("<wp:anchor")) {
        content = content.replace(/<wp:anchor[\s\S]*?<\/wp:anchor>/gi, "");
        localModified = true;
      }

      // 2. VML Logic: Har image ko handle karna aur redundant hatana
      const vmlRegex = /(<(v:shape|v:rect|v:image|v:oval)[^>]*style=")([^"]*)(")([^>]*>)([\s\S]*?)(<\/\2>)/gi;

      if (content.includes("v:shape") || content.includes("word/media")) {
        let isMainLogoProcessed = false;

        content = content.replace(vmlRegex, (match, start, tag, style, quote, mid, inner, end) => {
          if (style.includes("processed-fixed")) return match;
          
          localModified = true;

          // Agar ye pehli image mili hai, to isi ko watermark aur bottom logo mein badal do
          if (!isMainLogoProcessed) {
            isMainLogoProcessed = true;

            // Center Watermark Style (Bada aur Light)
            const centerStyle = `position:absolute;width:${WM_CENTER_SIZE};height:${WM_CENTER_SIZE};z-index:-251658240;mso-position-horizontal:center;mso-position-horizontal-relative:page;mso-position-vertical:center;mso-position-vertical-relative:page;opacity:${WM_OPACITY};filter:alpha(opacity=${parseFloat(WM_OPACITY) * 100});processed-fixed:yes;`;
            const centerPart = `${start}${centerStyle}${quote}${mid}${inner}${end}`;

            // Bottom Right Logo Style (Chota aur Solid)
            const bottomStyle = `position:absolute;width:${WM_BOTTOM_SIZE};height:${WM_BOTTOM_SIZE};z-index:251659264;mso-position-horizontal:right;mso-position-horizontal-relative:page;mso-position-vertical:bottom;mso-position-vertical-relative:page;opacity:1;processed-fixed:yes;`;
            const bottomPart = `${start.replace(/id="[^"]*"/i, 'id="wm_footer_final"')}${bottomStyle}${quote}${mid}${inner}${end}`;

            // Dono ko merge karke return karo
            return centerPart + bottomPart;
          }

          // Baaki jitni bhi extra images (chota logo etc.) milti hain, unhe delete (empty string) kar do
          return ""; 
        });
      }

      if (localModified) {
        zip.updateFile(entry.entryName, Buffer.from(content, "utf-8"));
        changed = true;
      }
    }
    return changed ? zip.toBuffer() : buffer;
  } catch (err: any) {
    console.error("DOCX Fix Error:", err.message);
    return buffer;
  }
}

// ─── MAIN EXECUTION ──────────────────────────────────────────────────────────
async function reWatermarkArticles() {
  console.log("🚀 [Re-Watermark v19] Clean Center + Bottom Logo Fixed");
  const s3Client = isLocal ? null : new S3Client({ region: AWS_REGION });

  try {
    const articles = await prisma.article.findMany();
    for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        console.log(`[${i+1}/${articles.length}] Processing: ${article.title}`);

        try {
          // 1. Clean PDF
          const pdfUrl = article.originalPdfUrl || article.currentPdfUrl;
          if (pdfUrl) {
            const pdfBuffer = await downloadFileToBuffer(pdfUrl);
            const cleanPdf = await aggressivelyCleanPdf(pdfBuffer);
            const key = article.currentPdfUrl ? new URL(article.currentPdfUrl).pathname.slice(1) : null;
            if (s3Client && key) {
              await s3Client.send(new PutObjectCommand({
                Bucket: S3_BUCKET_ARTICLES,
                Key: key,
                Body: cleanPdf,
                ContentType: "application/pdf",
              }));
              console.log("   ✅ PDF Scrubbed");
            }
          }

          // 2. Clean DOCX
          const wordUrl = article.originalWordUrl || article.currentWordUrl;
          if (wordUrl) {
            const wordBuffer = await downloadFileToBuffer(wordUrl);
            const cleanWord = cleanDocxBuffer(wordBuffer);
            const key = article.currentWordUrl ? new URL(article.currentWordUrl).pathname.slice(1) : null;
            if (s3Client && key) {
              await s3Client.send(new PutObjectCommand({
                Bucket: S3_BUCKET_ARTICLES,
                Key: key,
                Body: cleanWord,
                ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              }));
              console.log("   ✅ DOCX Cleaned (Double Logo Removed)");
            }
          }
        } catch (err: any) { console.error(`   ❌ Failed: ${err.message}`); }
    }
  } catch (e) { console.error(e); } finally { process.exit(0); }
}

reWatermarkArticles();