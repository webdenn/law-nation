import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import { PDFDocument, PDFName, PDFDict, PDFRef, PDFStream, PDFRawStream, PDFArray } from "pdf-lib";
import fs from "fs";
import path from "path";
import { adobeService } from "../services/adobe.service.js";

/**
 * RE-WATERMARK SCRIPT v6: The Ultimate Clean-up
 * 
 * 1. If DOCX exists (originalWordUrl), convert to PDF -> 100% Clean.
 * 2. If only PDF exists, aggressively strip:
 *    - Image XObjects
 *    - Form XObjects
 *    - Annotations (often used for bordered watermarks)
 *    - Content stream 'Do' operators
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

/**
 * Aggressively remove images, forms, and annotations.
 */
async function aggressivelyCleanPdf(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { 
    ignoreEncryption: true,
    throwOnInvalidObject: false 
  });
  const pages = pdfDoc.getPages();

  console.log(`   📄 PDF has ${pages.length} pages`);

  let totalRemoved = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    
    // 1. Remove Annotations (often contains border boxes/links)
    const annots = page.node.get(PDFName.of("Annots"));
    if (annots) {
      page.node.delete(PDFName.of("Annots"));
      console.log(`   Page ${i + 1}: Removed all Annotations`);
    }

    // 2. Remove XObjects (Images/Forms)
    const resources = page.node.get(PDFName.of("Resources"));
    if (resources instanceof PDFDict) {
      const xObjectRef = resources.get(PDFName.of("XObject"));
      if (xObjectRef) {
        let xObjectDict: PDFDict | undefined;
        if (xObjectRef instanceof PDFDict) xObjectDict = xObjectRef;
        else if (xObjectRef instanceof PDFRef) {
          const res = pdfDoc.context.lookup(xObjectRef);
          if (res instanceof PDFDict) xObjectDict = res;
        }

        if (xObjectDict) {
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

          for (const key of keysToRemove) {
            xObjectDict.delete(key);
            totalRemoved++;
          }

          if (keysToRemove.length > 0) {
            // Clean Content Streams
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
            console.log(`   Page ${i + 1}: Removed ${keysToRemove.length} images/forms`);
          }
        }
      }
    }
  }

  const cleanedPdfBytes = await pdfDoc.save();
  return Buffer.from(cleanedPdfBytes);
}

async function reWatermarkArticles() {
  console.log("🚀 [Re-Watermark v6] Ultimate Clean-up Strategy");
  
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
      },
    });

    console.log(`📊 Total Articles: ${articles.length}\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const progress = `[${i + 1}/${articles.length}]`;
      const tempPath = path.join(process.cwd(), 'uploads', 'temp', `recovery-${article.id}.pdf`);

      try {
        console.log(`${progress}  "${article.title}"`);
        
        let cleanPdfBuffer: Buffer | null = null;

        // STRATEGY 1: Use Original DOCX if available (SAFEST)
        if (article.originalWordUrl) {
          console.log(`${progress}  🔄 Found original DOCX. Re-converting to PDF for 100% clean result...`);
          try {
            const cleanPdfPath = await adobeService.convertDocxToPdf(article.originalWordUrl, tempPath);
            cleanPdfBuffer = fs.readFileSync(cleanPdfPath);
            console.log(`${progress}  ✅ Re-conversion successful.`);
            if (fs.existsSync(cleanPdfPath)) fs.unlinkSync(cleanPdfPath);
          } catch (convErr) {
            console.warn(`${progress}  ⚠️ DOCX conversion failed, falling back to PDF cleaning...`);
          }
        }

        // STRATEGY 2: Aggressive PDF cleaning (FALLBACK)
        if (!cleanPdfBuffer && article.originalPdfUrl) {
          console.log(`${progress}  🧹 No DOCX or conversion failed. Cleaning original PDF aggressively...`);
          const pdfBuffer = await downloadFileToBuffer(article.originalPdfUrl);
          cleanPdfBuffer = await aggressivelyCleanPdf(pdfBuffer);
        }

        if (cleanPdfBuffer) {
          // 1. Update currentPdfUrl (User Side)
          const currentKey = extractS3Key(article.currentPdfUrl);
          if (currentKey && s3Client) {
            console.log(`${progress}  📤 Overwriting Current PDF in S3...`);
            await s3Client.send(new PutObjectCommand({
              Bucket: S3_BUCKET_ARTICLES,
              Key: currentKey,
              Body: cleanPdfBuffer,
              ContentType: "application/pdf",
            }));
          }

          // 2. Update originalPdfUrl (Admin/Review Side)
          // This fixes the "double logo" in Review Panel
          const originalKey = extractS3Key(article.originalPdfUrl);
          if (originalKey && s3Client && originalKey !== currentKey) {
            console.log(`${progress}  📤 Overwriting Original PDF in S3 (Fixes Review Panel)...`);
            await s3Client.send(new PutObjectCommand({
              Bucket: S3_BUCKET_ARTICLES,
              Key: originalKey,
              Body: cleanPdfBuffer,
              ContentType: "application/pdf",
            }));
          }

          console.log(`${progress}  ✨ Done!\n`);
          successCount++;
        } else {
          console.log(`${progress}  ⏭️ Skipping (no source found)\n`);
        }

      } catch (err: any) {
        console.error(`${progress}  ❌ Failed: ${err?.message || err}\n`);
        failCount++;
      }
    }

    console.log(`\n✅ RE-WATERMARK v6 COMPLETE. Success: ${successCount}, Failed: ${failCount}`);
  } catch (error: any) {
    console.error(" Fatal Error:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

reWatermarkArticles();

