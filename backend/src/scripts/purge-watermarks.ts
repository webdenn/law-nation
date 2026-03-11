import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { PDFDocument, PDFName, PDFDict, PDFRef, PDFStream, PDFRawStream } from "pdf-lib";
import AdmZip from "adm-zip";
import { Readable } from "stream";

// ─── CONFIG ─────────────────────────────────────────────────────────
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";

const s3Client = new S3Client({ region: AWS_REGION });

// Helper: Stream to Buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: any[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// Helper: Secure S3 Download
async function downloadFromS3(url: string): Promise<Buffer> {
  const urlObj = new URL(url);
  const key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
  const command = new GetObjectCommand({ Bucket: S3_BUCKET_ARTICLES, Key: key });
  const response = await s3Client.send(command);
  return await streamToBuffer(response.Body as Readable);
}

// ─── NUCLEAR PDF PURGE (Removes ALL Images & Watermark Text) ────────
async function purgePdf(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true, throwOnInvalidObject: false });
  pdfDoc.catalog.delete(PDFName.of("OCProperties"));

  const pages = pdfDoc.getPages();
  for (const page of pages) {
    page.node.delete(PDFName.of("Annots"));
    const resources = page.node.get(PDFName.of("Resources"));
    if (resources instanceof PDFDict) {
      resources.delete(PDFName.of("XObject")); // Kills images
      resources.delete(PDFName.of("Pattern")); // Kills patterns
      resources.delete(PDFName.of("ExtGState")); // Kills transparency groups
    }

    try {
      const contents = page.node.get(PDFName.of("Contents"));
      if (contents) {
        const contentRefs = Array.isArray(contents) ? contents : [contents];
        for (const ref of contentRefs) {
          const stream = pdfDoc.context.lookup(ref as PDFRef);
          if (stream instanceof PDFRawStream || stream instanceof PDFStream) {
            let text = Buffer.from((stream as any).contents).toString("latin1");
            text = text.replace(/\/[A-Za-z0-9]+\s+Do/g, ""); // Purge DrawImage calls
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

// ─── NUCLEAR DOCX PURGE (Removes ALL Watermark Shapes) ──────────────
function purgeDocx(buffer: Buffer): Buffer {
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    let changed = false;

    for (const entry of entries) {
      if (!entry.entryName.startsWith("word/") || !entry.entryName.endsWith(".xml")) continue;
      let content = entry.getData().toString("utf-8");
      let localModified = false;

      // 1. Strip Watermark Text Paragraphs
      if (content.includes("Downloaded from") || content.includes("Article ID")) {
        content = content.replace(/<w:p(?![^>]*w:p).*?Downloaded from.*?<\/w:p>/gi, "");
        content = content.replace(/<w:p(?![^>]*w:p).*?Article ID:.*?<\/w:p>/gi, "");
        localModified = true;
      }

      // 2. Strip ALL VML Shapes (Images/Watermarks)
      const vmlRegex = /(<(v:shape|v:rect|v:image|v:oval)[^>]*>)([\s\S]*?)(<\/\2>)/gi;
      if (vmlRegex.test(content)) {
        content = content.replace(vmlRegex, "<!-- purged -->");
        localModified = true;
      }

      // 3. Strip Modern DrawingML Anchors
      if (content.includes("<wp:anchor")) {
        content = content.replace(/<wp:anchor[^>]*>[\s\S]*?<\/wp:anchor>/gi, "<!-- purged anchor -->");
        localModified = true;
      }

      if (localModified) {
        zip.updateFile(entry.entryName, Buffer.from(content, "utf-8"));
        changed = true;
      }
    }
    return changed ? zip.toBuffer() : buffer;
  } catch (err: any) {
    console.error("DOCX Purge Error:", err.message);
    return buffer;
  }
}

// ─── MAIN EXECUTION ──────────────────────────────────────────────────
async function purgeAllWatermarks() {
  console.log("🧨 [Nuclear Purge v1] REMOVING EVERYTHING FROM S3...");
  const articles = await prisma.article.findMany();

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    console.log(`[${i+1}/${articles.length}] Purging: ${article.title}`);

    try {
      const pdfUrl = article.originalPdfUrl || article.currentPdfUrl;
      if (pdfUrl) {
        const pdfBuf = await downloadFromS3(pdfUrl);
        const cleanPdf = await purgePdf(pdfBuf);
        const key = article.currentPdfUrl ? new URL(article.currentPdfUrl).pathname.slice(1) : null;
        if (key) {
          await s3Client.send(new PutObjectCommand({ Bucket: S3_BUCKET_ARTICLES, Key: key, Body: cleanPdf, ContentType: "application/pdf" }));
        }
      }

      const wordUrl = article.originalWordUrl || article.currentWordUrl;
      if (wordUrl) {
        const wordBuf = await downloadFromS3(wordUrl);
        const cleanWord = purgeDocx(wordBuf);
        const key = article.currentWordUrl ? new URL(article.currentWordUrl).pathname.slice(1) : null;
        if (key) {
          await s3Client.send(new PutObjectCommand({ Bucket: S3_BUCKET_ARTICLES, Key: key, Body: cleanWord, ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
        }
      }
      console.log("   ✅ Purged.");
    } catch (err: any) { console.error(`   ❌ Failed: ${err.message}`); }
  }
  process.exit(0);
}

purgeAllWatermarks();
