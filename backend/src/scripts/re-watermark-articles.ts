import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import { PDFDocument, PDFName, PDFDict, PDFRef, PDFStream, PDFRawStream } from "pdf-lib";
import fs from "fs";
import path from "path";
import { adobeService } from "../services/adobe.service.js";

/**
 * RE-WATERMARK SCRIPT v8: THE FINAL BOSS
 * 
 * 1. Overwrites BOTH Current and Original PDFs in S3.
 * 2. Removes Images, Forms, Patterns, and Annotations.
 * 3. Prioritizes DOCX-to-PDF recovery.
 */

const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";

const isLocal = process.env.NODE_ENV === "local";

function extractS3Key(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;
  } catch {
    return null;
  }
}

async function aggressivelyCleanPdf(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { 
    ignoreEncryption: true,
    throwOnInvalidObject: false 
  });
  const pages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    
    // 1. Remove Annotations (often contains border boxes/links)
    page.node.delete(PDFName.of("Annots"));

    // 2. Clear Resources (Images, Forms, Patterns)
    const resources = page.node.get(PDFName.of("Resources"));
    if (resources instanceof PDFDict) {
      const xObjectRef = resources.get(PDFName.of("XObject"));
      if (xObjectRef) {
        const xObjectDict = xObjectRef instanceof PDFRef ? pdfDoc.context.lookup(xObjectRef) : xObjectRef;
        if (xObjectDict instanceof PDFDict) {
          const keysToRemove: PDFName[] = [];
          for (const [key, value] of xObjectDict.entries()) {
            let xObj = value instanceof PDFRef ? pdfDoc.context.lookup(value) : value;
            if (xObj instanceof PDFDict || xObj instanceof PDFStream || xObj instanceof PDFRawStream) {
              const dict = xObj instanceof PDFDict ? xObj : (xObj as any).dict;
              const subtype = dict?.get(PDFName.of("Subtype"))?.toString();
              if (subtype === "/Image" || subtype === "/Form") {
                keysToRemove.push(key as PDFName);
              }
            }
          }
          for (const key of keysToRemove) xObjectDict.delete(key);
          
          if (keysToRemove.length > 0) {
            try {
              const contents = page.node.get(PDFName.of("Contents"));
              if (contents) {
                const contentRefs = Array.isArray(contents) ? contents : [contents];
                for (const ref of contentRefs) {
                  const stream = pdfDoc.context.lookup(ref as PDFRef);
                  if (stream instanceof PDFRawStream || stream instanceof PDFStream) {
                    let text = Buffer.from((stream as any).contents).toString("latin1");
                    let modified = false;
                    for (const key of keysToRemove) {
                      const name = key.toString();
                      const doRegex = new RegExp(`\\/[A-Za-z0-9]+\\s+cm\\s+\\${name}\\s+Do`, "g");
                      const simpleDoRegex = new RegExp(`\\${name}\\s+Do`, "g");
                      if (doRegex.test(text)) { text = text.replace(doRegex, ""); modified = true; }
                      else if (simpleDoRegex.test(text)) { text = text.replace(simpleDoRegex, ""); modified = true; }
                    }
                    if (modified) (stream as any).contents = Buffer.from(text, "latin1");
                  }
                }
              }
            } catch (err) { }
          }
        }
      }
      resources.delete(PDFName.of("Pattern"));
    }
  }

  const cleanedPdfBytes = await pdfDoc.save();
  return Buffer.from(cleanedPdfBytes);
}

async function reWatermarkArticles() {
  console.log("🚀 [Re-Watermark v8] FINAL AGGRESSIVE CLEANUP");
  console.log("📋 Overwriting BOTH Original and Current PDFs to fix Review Panel.");
  
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
      }
    });

    console.log(`📊 Processing ${articles.length} articles...\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const progress = `[${i + 1}/${articles.length}]`;
      const tempPath = path.join(process.cwd(), 'uploads', 'temp', `recovery-${article.id}.pdf`);

      try {
        console.log(`${progress}  "${article.title}"`);
        let cleanPdfBuffer: Buffer | null = null;

        if (article.originalWordUrl) {
          try {
            const cleanPdfPath = await adobeService.convertDocxToPdf(article.originalWordUrl, tempPath);
            cleanPdfBuffer = fs.readFileSync(cleanPdfPath);
            if (fs.existsSync(cleanPdfPath)) fs.unlinkSync(cleanPdfPath);
            console.log("   ✅ DOCX recovery successful");
          } catch (convErr) { }
        }

        if (!cleanPdfBuffer && article.originalPdfUrl) {
          const pdfBuffer = await downloadFileToBuffer(article.originalPdfUrl);
          cleanPdfBuffer = await aggressivelyCleanPdf(pdfBuffer);
          console.log("   🧹 PDF stripped successfully");
        }

        if (cleanPdfBuffer) {
          const currentKey = extractS3Key(article.currentPdfUrl);
          const originalKey = extractS3Key(article.originalPdfUrl);

          if (currentKey && s3Client) {
            await s3Client.send(new PutObjectCommand({ 
              Bucket: S3_BUCKET_ARTICLES, Key: currentKey, Body: cleanPdfBuffer, ContentType: "application/pdf" 
            }));
            console.log("   📤 Current PDF overwritten");
          }

          if (originalKey && s3Client && originalKey !== currentKey) {
            await s3Client.send(new PutObjectCommand({ 
              Bucket: S3_BUCKET_ARTICLES, Key: originalKey, Body: cleanPdfBuffer, ContentType: "application/pdf" 
            }));
            console.log("   📤 Original PDF overwritten (Fixes Review)");
          }
          successCount++;
        }
      } catch (err: any) {
        console.error(`   ❌ Failed: ${err.message}`);
        failCount++;
      }
    }

    console.log(`\n✨ DONE! Status: v8. Success: ${successCount}, Fail: ${failCount}`);
  } catch (error: any) {
    console.error(" Fatal Error:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

reWatermarkArticles();
