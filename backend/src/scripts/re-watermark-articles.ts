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
      if (entry.entryName.startsWith("word/") && entry.entryName.endsWith(".xml")) {
        let content = entry.getData().toString("utf-8");
        let localModified = false;

        // Strategy A: Resize huge styles (width/height > 100pt etc)
        const styleRegex = /style="([^"]*)"/gi;
        content = content.replace(styleRegex, (match, style) => {
          let newStyle = style;
          let styleModified = false;
          const dimRegex = /(width|height)\s*:\s*(\d+\.?\d*)\s*(pt|in|px|cm|mm|)/gi;
          
          newStyle = newStyle.replace(dimRegex, (m, prop, val, unit) => {
            const v = parseFloat(val);
            let isGiant = false;
            if (unit === 'pt' && v > 100) isGiant = true;
            else if (unit === 'in' && v > 1.3) isGiant = true;
            else if (unit === 'px' && v > 140) isGiant = true;
            else if (!unit && v > 1000) isGiant = true;

            if (isGiant) {
              const newVal = unit === 'in' ? '0.6' : (unit === 'px' ? '60' : '50');
              styleModified = true;
              return `${prop}:${newVal}${unit}`;
            }
            return m;
          });
          if (styleModified) localModified = true;
          return styleModified ? `style="${newStyle}"` : match;
        });

        // Strategy B: If content includes "LAW NATION" or "PRIME TIMES", and it's a shape/image, resize it forcibly.
        if (content.includes("LAW NATION") || content.includes("PRIME TIMES")) {
           const genericShapeRegex = /(<(?:v:shape|v:rect|v:image|v:oval)[^>]*style=")([^"]*)("[^>]*>[\s\S]*?(?:LAW NATION|PRIME TIMES)[\s\S]*?<\/(?:v:shape|v:rect|v:image|v:oval)>)/gi;
           content = content.replace(genericShapeRegex, (match, start, style, end) => {
              if (!style.includes('width:60pt')) { 
                localModified = true;
                const smallStyle = "position:absolute;margin-left:20pt;margin-top:20pt;width:60pt;height:60pt;z-index:251658240;mso-position-horizontal:absolute;mso-position-horizontal-relative:margin;mso-position-vertical:absolute;mso-position-vertical-relative:margin";
                return `${start}${smallStyle}${end}`;
              }
              return match;
           });
        }

        // Strategy C: Target elements that are background-relative or page-relative
        if (content.includes('mso-position-vertical-relative:page') || content.includes('mso-position-horizontal-relative:page')) {
           const pageRelativeRegex = /(<(?:v:shape|v:rect|v:image|v:oval)[^>]*style=")([^"]*width\s*:\s*\d+\.?\d*(?:pt|in|px|cm|mm|)[^"]*)("[^>]*>)/gi;
           content = content.replace(pageRelativeRegex, (match, start, style, end) => {
              if ((style.includes('relative:page') || style.includes('width:100%') || style.includes('height:100%')) && !style.includes('width:60pt')) {
                localModified = true;
                const smallStyle = "position:absolute;margin-left:20pt;margin-top:20pt;width:65pt;height:65pt;z-index:251658240;mso-position-horizontal:absolute;mso-position-horizontal-relative:margin;mso-position-vertical:absolute;mso-position-vertical-relative:margin";
                return `${start}${smallStyle}${end}`;
              }
              return match;
           });
        }

        // Strategy D: Target DrawingML (EMU units) - wp:extent and a:ext
        const drawingMLRegex = /<(wp:extent|a:ext)\s+cx="(\d+)"\s+cy="(\d+)"/gi;
        content = content.replace(drawingMLRegex, (match, tag, cx, cy) => {
           const valCx = parseInt(cx);
           const valCy = parseInt(cy);
           if (valCx > 1000000 || valCy > 1000000) {
              localModified = true;
              const newCx = 640080; // ~0.7 inch
              const newCy = Math.round(valCy * (newCx / valCx));
              return `<${tag} cx="${newCx}" cy="${newCy}"`;
           }
           return match;
        });

        if (localModified) {
          zip.updateFile(entry.entryName, Buffer.from(content, "utf-8"));
          changed = true;
        }
      }
    }

    return changed ? zip.toBuffer() : buffer;
  } catch (err: any) {
    console.error("   ⚠️ DOCX manual cleaning failed:", err.message);
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
