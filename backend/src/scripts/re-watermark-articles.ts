import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import { PDFDocument, PDFName, PDFDict, PDFRef, PDFStream, PDFRawStream } from "pdf-lib";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

/**
 * RE-WATERMARK SCRIPT v11: THE TOTAL CLEANER (NO ADOBE NEEDED)
 * 
 * 1. Overwrites BOTH Current and Original PDFs in S3 (Nuclear Strip).
 * 2. Overwrites BOTH Current and Original DOCX in S3 (Manual ZIP Strip).
 * 3. Removes Images, Forms, Patterns from PDF.
 * 4. Removes Watermark VML/Images from DOCX headers manually.
 */

const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";

const isLocal = process.env.NODE_ENV === "local";

function extractS3Key(url: string | null): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;
  } catch {
    return null;
  }
}

async function aggressivelyCleanPdf(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true, throwOnInvalidObject: false });
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
    // Content stream scrubbing
    try {
      const contents = page.node.get(PDFName.of("Contents"));
      if (contents) {
        const contentRefs = Array.isArray(contents) ? contents : [contents];
        for (const ref of contentRefs) {
          const stream = pdfDoc.context.lookup(ref as PDFRef);
          if (stream instanceof PDFRawStream || stream instanceof PDFStream) {
            let text = Buffer.from((stream as any).contents).toString("latin1");
            const anyDoRegex = /\/[A-Za-z0-9]+\s+Do/g; 
            if (anyDoRegex.test(text)) {
              text = text.replace(anyDoRegex, "");
              (stream as any).contents = Buffer.from(text, "latin1");
            }
          }
        }
      }
    } catch (err) {}
  }
  return Buffer.from(await pdfDoc.save());
}

/**
 * Strips watermark elements from DOCX manually by editing the internal XML.
 */
function cleanDocxBuffer(buffer: Buffer): Buffer {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    let changed = false;

    for (const entry of zipEntries) {
      // Watermarks are usually in headers
      if (entry.entryName.startsWith("word/header") && entry.entryName.endsWith(".xml")) {
        let content = entry.getData().toString("utf8");
        
        // 1. Remove VML Shapes (common Word watermark format)
        // Look for shapes containing our logo text or common watermark descriptors
        if (content.includes("LAW NATION") || content.includes("PowerPoint") || content.includes("Word.Document")) {
          // Remove entire <w:pict> or <v:shape> blocks that look like watermarks
          const originalContent = content;
          content = content.replace(/<w:pict>[\s\S]*?<\/w:pict>/g, "");
          content = content.replace(/<v:shape[\s\S]*?<\/v:shape>/g, "");
          
          if (content !== originalContent) {
            zip.updateFile(entry.entryName, Buffer.from(content, "utf8"));
            changed = true;
          }
        }
      }
      
      // 2. Clear media folder if it contains large background images
      // (Optional: safer to keep images unless we are sure they are watermarks)
      // For now, let's stick to header XML cleaning which is targetted.
    }

    return changed ? zip.toBuffer() : buffer;
  } catch (err) {
    console.error("   ⚠️ DOCX Manual cleaning failed:", err.message);
    return buffer;
  }
}

async function reWatermarkArticles() {
  console.log("🚀 [Re-Watermark v11] TOTAL PDF & WORD CLEANUP (PRO MAX)");
  
  let s3Client: S3Client | null = null;
  if (!isLocal && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      region: AWS_REGION,
      credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
    });
  }

  try {
    const articles = await prisma.article.findMany({
      select: {
        id: true,
        title: true,
        originalPdfUrl: true,
        currentPdfUrl: true,
        originalWordUrl: true,
        currentWordUrl: true,
      }
    });

    console.log(`📊 Processing ${articles.length} articles...\n`);

    let successCount = 0;

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const progress = `[${i + 1}/${articles.length}]`;

      try {
        console.log(`${progress}  "${article.title}"`);

        // 1. Clean PDF
        const pdfUrl = article.originalPdfUrl || article.currentPdfUrl;
        if (pdfUrl) {
          const pdfBuffer = await downloadFileToBuffer(pdfUrl);
          const cleanPdf = await aggressivelyCleanPdf(pdfBuffer);
          
          const currentPdfKey = extractS3Key(article.currentPdfUrl);
          const originalPdfKey = extractS3Key(article.originalPdfUrl);

          if (s3Client) {
            if (currentPdfKey) await s3Client.send(new PutObjectCommand({ Bucket: S3_BUCKET_ARTICLES, Key: currentPdfKey, Body: cleanPdf, ContentType: "application/pdf" }));
            if (originalPdfKey && originalPdfKey !== currentPdfKey) await s3Client.send(new PutObjectCommand({ Bucket: S3_BUCKET_ARTICLES, Key: originalPdfKey, Body: cleanPdf, ContentType: "application/pdf" }));
          }
          console.log("   ✅ PDF cleaned");
        }

        // 2. Clean Word (DOCX)
        const wordUrl = article.originalWordUrl || article.currentWordUrl;
        if (wordUrl) {
          const wordBuffer = await downloadFileToBuffer(wordUrl);
          const cleanWord = cleanDocxBuffer(wordBuffer);
          
          const currentWordKey = extractS3Key(article.currentWordUrl);
          const originalWordKey = extractS3Key(article.originalWordUrl);

          if (s3Client) {
            if (currentWordKey) await s3Client.send(new PutObjectCommand({ Bucket: S3_BUCKET_ARTICLES, Key: currentWordKey, Body: cleanWord, ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
            if (originalWordKey && originalWordKey !== currentWordKey) await s3Client.send(new PutObjectCommand({ Bucket: S3_BUCKET_ARTICLES, Key: originalWordKey, Body: cleanWord, ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
          }
          console.log("   ✅ Word cleaned manually");
        }

        successCount++;
      } catch (err: any) {
        console.error(`   ❌ Failed: ${err.message}`);
      }
    }

    console.log(`\n✨ DONE! Status: v11. Success: ${successCount}`);
  } catch (error: any) {
    console.error(" Fatal Error:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

reWatermarkArticles();
