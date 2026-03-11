import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { PDFDocument, PDFName, PDFDict, PDFRef, PDFStream, PDFRawStream } from "pdf-lib";
import AdmZip from "adm-zip";
import { Readable } from "stream";

// ─── CONFIG ─────────────────────────────────────────────────────────
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";
const isLocal = process.env.NODE_ENV === "local";

// Initialize S3 once
const s3Client = new S3Client({ region: AWS_REGION });

// Helper: Stream to Buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: any[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Helper: Secure S3 Download
async function downloadFromS3(url: string): Promise<Buffer> {
  try {
    const urlObj = new URL(url);
    let key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
    // Handle cases where bucket name might be in the path (path-style URLs)
    if (key.startsWith(`${S3_BUCKET_ARTICLES}/`)) {
      key = key.replace(`${S3_BUCKET_ARTICLES}/`, "");
    }

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_ARTICLES,
      Key: key,
    });

    const response = await s3Client.send(command);
    return await streamToBuffer(response.Body as Readable);
  } catch (err: any) {
    throw new Error(`S3 Download Failed: ${err.message}`);
  }
}

// ─── WATERMARK SETTINGS ─────────────────────────────────────────────
const WM_CENTER_SIZE = "350pt";
const WM_OPACITY = "0.10";

// ─── PDF CLEANER ───────────────────────────────────────────────────
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
            text = text.replace(/\/[A-Za-z0-9]+\s+Do/g, "");
            text = text.replace(/\(Downloaded from.*?\)\s+Tj/gi, "() Tj");
            text = text.replace(/\(Downloaded from.*?\)\s+TJ/gi, "[] TJ");
            text = text.replace(/\(Article ID:.*?\)\s+Tj/gi, "() Tj");
            text = text.replace(/\(itorial Use Only\)\s+Tj/gi, "() Tj");
            (stream as any).contents = Buffer.from(text, "latin1");
          }
        }
      }
    } catch (_) {}
  }
  return Buffer.from(await pdfDoc.save());
}

// ─── DOCX FIX ENGINE ───────────────────────────────────────────────
function cleanDocxBuffer(buffer: Buffer): Buffer {
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    let changed = false;
    const WM_BOTTOM_SIZE = "85pt";

    for (const entry of entries) {
      if (!entry.entryName.startsWith("word/") || !entry.entryName.endsWith(".xml")) continue;
      let content = entry.getData().toString("utf-8");
      let localModified = false;

      if (content.includes("Downloaded from") || content.includes("Article ID")) {
        content = content.replace(/<w:p(?![^>]*w:p).*?Downloaded from.*?<\/w:p>/gi, "");
        content = content.replace(/<w:p(?![^>]*w:p).*?Article ID:.*?<\/w:p>/gi, "");
        localModified = true;
      }

      const vmlRegex = /(<(v:shape|v:rect|v:image|v:oval)[^>]*style=")([^"]*)(")([^>]*>)([\s\S]*?)(<\/\2>)/gi;
      let shapeIndex = 0;
      content = content.replace(vmlRegex, (match, start, tag, style, quote, mid, inner, end) => {
        shapeIndex++;
        localModified = true;
        if (shapeIndex === 1) { 
          const centerStyle = `position:absolute;width:${WM_CENTER_SIZE};height:${WM_CENTER_SIZE};z-index:-251658240;mso-position-horizontal:center;mso-position-horizontal-relative:page;mso-position-vertical:center;mso-position-vertical-relative:page;opacity:${WM_OPACITY};filter:alpha(opacity=${parseFloat(WM_OPACITY) * 100});processed-fixed:yes;`;
          const bottomStyle = `position:absolute;width:${WM_BOTTOM_SIZE};height:${WM_BOTTOM_SIZE};z-index:251659264;mso-position-horizontal:right;mso-position-horizontal-relative:page;mso-position-vertical:bottom;mso-position-vertical-relative:page;opacity:1;processed-fixed:yes;`;
          return `${start}${centerStyle}${quote}${mid}${inner}${end}${start}${bottomStyle}${quote}${mid}${inner}${end}`;
        }
        return `<!-- stripped -->`;
      });

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
  console.log("🚀 [Re-Watermark v19] SECURE S3 ACCESS MODE");

  try {
    const articles = await prisma.article.findMany();
    for (let i = 0; i < articles.length; i++) {
       const article = articles[i];
       console.log(`[${i+1}/${articles.length}] ${article.title}`);

       try {
         // 1. Clean PDF
         const pdfUrl = article.originalPdfUrl || article.currentPdfUrl;
         if (pdfUrl) {
           const pdfBuffer = await downloadFromS3(pdfUrl);
           const cleanPdf = await aggressivelyCleanPdf(pdfBuffer);
           const key = article.currentPdfUrl ? new URL(article.currentPdfUrl).pathname.slice(1) : null;
           if (key) {
             await s3Client.send(new PutObjectCommand({
               Bucket: S3_BUCKET_ARTICLES,
               Key: key,
               Body: cleanPdf,
               ContentType: "application/pdf",
             }));
             console.log("   ✅ PDF Nuclear Cleaned");
           }
         }

         // 2. Clean DOCX
         const wordUrl = article.originalWordUrl || article.currentWordUrl;
         if (wordUrl) {
           const wordBuffer = await downloadFromS3(wordUrl);
           const cleanWord = cleanDocxBuffer(wordBuffer);
           const key = article.currentWordUrl ? new URL(article.currentWordUrl).pathname.slice(1) : null;
           if (key) {
             await s3Client.send(new PutObjectCommand({
               Bucket: S3_BUCKET_ARTICLES,
               Key: key,
               Body: cleanWord,
               ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
             }));
             console.log("   ✅ DOCX Nuclear Cleaned");
           }
         }
       } catch (err: any) { console.error(`   ❌ Error: ${err.message}`); }
    }
  } catch (e) { console.error(e); } finally { process.exit(0); }
}

reWatermarkArticles();