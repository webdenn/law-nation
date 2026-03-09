import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import { PDFDocument, PDFName, PDFDict, PDFRef, PDFStream, PDFRawStream } from "pdf-lib";
import fs from "fs";
import path from "path";

/**
 * RE-WATERMARK SCRIPT v5: Safe image-only removal from PDF.
 * 
 * How it works:
 * - PDF stores images as "XObject" resources (separate from text)
 * - Watermark logo = an Image XObject in the page's resources
 * - We remove ONLY Image XObjects, leaving text 100% intact
 * - Text is defined in the content stream using BT/ET operators (untouched)
 * 
 * ⚠️ NO DATABASE CHANGES
 * ⚠️ TEXT IS NEVER TOUCHED - only images are removed
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
 * Remove ONLY image XObjects from a PDF's page resources.
 * Text content streams are also modified to remove the actual 'Do' (Draw Object) 
 * commands for those images, preventing "empty boxes".
 */
async function removeImagesFromPdf(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  console.log(`   📄 PDF has ${pages.length} pages`);

  let totalRemoved = 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const resources = page.node.get(PDFName.of("Resources"));

    if (!(resources instanceof PDFDict)) {
      console.log(`   Page ${i + 1}: No resources dict, skipping`);
      continue;
    }

    // Get the XObject subdictionary
    const xObjectRef = resources.get(PDFName.of("XObject"));
    if (!xObjectRef) {
      console.log(`   Page ${i + 1}: No XObjects, skipping`);
      continue;
    }

    // Resolve the XObject dictionary
    let xObjectDict: PDFDict;
    if (xObjectRef instanceof PDFDict) {
      xObjectDict = xObjectRef;
    } else if (xObjectRef instanceof PDFRef) {
      const resolved = pdfDoc.context.lookup(xObjectRef);
      if (resolved instanceof PDFDict) {
        xObjectDict = resolved;
      } else {
        console.log(`   Page ${i + 1}: Can't resolve XObject dict, skipping`);
        continue;
      }
    } else {
      console.log(`   Page ${i + 1}: Unknown XObject type, skipping`);
      continue;
    }

    // Find image or form XObjects to remove (watermarks can be either)
    const keysToRemove: PDFName[] = [];
    const entries = xObjectDict.entries();

    for (const [key, value] of entries) {
      let xObj: any = value;
      if (value instanceof PDFRef) {
        xObj = pdfDoc.context.lookup(value);
      }

      if (xObj instanceof PDFDict || xObj instanceof PDFStream || xObj instanceof PDFRawStream) {
        const dict = xObj instanceof PDFDict ? xObj : (xObj as any).dict;
        if (dict) {
          const subtype = dict.get(PDFName.of("Subtype"));
          const subtypeStr = subtype ? subtype.toString() : "";
          
          // Remove both Images and Forms (watermarks are often Forms)
          if (subtypeStr === "/Image" || subtypeStr === "/Form") {
            keysToRemove.push(key as PDFName);
            console.log(`   Page ${i + 1}: Found ${subtypeStr} XObject "${key.toString()}" → will remove`);
          }
        }
      }
    }

    if (keysToRemove.length > 0) {
      // 1. Remove XObjects from the dictionary
      for (const key of keysToRemove) {
        xObjectDict.delete(key);
        totalRemoved++;
      }

      // 2. CRITICAL: Clean the content stream to remove drawing commands for these objects
      try {
        const contents = page.node.get(PDFName.of("Contents"));
        if (contents) {
          const contentRefs = Array.isArray(contents) ? (contents as any) : [contents];
          
          for (const ref of contentRefs) {
            const stream = pdfDoc.context.lookup(ref);
            if (stream instanceof PDFRawStream || stream instanceof PDFStream) {
              let text = Buffer.from((stream as any).contents).toString("latin1");
              let modified = false;

              for (const key of keysToRemove) {
                const name = key.toString(); // e.g. /Im1 or /Fm1
                
                // More aggressive regex to remove the entire drawing operation
                // Matches: /Name Do, q ... /Name Do ... Q, etc.
                const doRegex = new RegExp(`\\/[A-Za-z0-9]+\\s+cm\\s+\\${name}\\s+Do`, "g");
                const simpleDoRegex = new RegExp(`\\${name}\\s+Do`, "g");
                
                if (doRegex.test(text)) {
                  text = text.replace(doRegex, "");
                  modified = true;
                } else if (simpleDoRegex.test(text)) {
                  text = text.replace(simpleDoRegex, "");
                  modified = true;
                }
              }

              if (modified) {
                (stream as any).contents = Buffer.from(text, "latin1");
                console.log(`   Page ${i + 1}: Cleaned content stream (removed drawing commands)`);
              }
            }
          }
        }
      } catch (streamErr) {
        console.warn(`   Page ${i + 1}: Failed to clean content stream:`, streamErr);
      }

      console.log(`   Page ${i + 1}: Removed ${keysToRemove.length} object(s)`);
    } else {
      console.log(`   Page ${i + 1}: No image/form watermarks found`);
    }
  }

  console.log(`   ✅ Total images removed: ${totalRemoved}`);

  const cleanedPdfBytes = await pdfDoc.save();
  return Buffer.from(cleanedPdfBytes);
}

async function reWatermarkArticles() {
  console.log("🚀 [Re-Watermark v5] Safe image-only removal from PDF");
  console.log("📋 Removes Image XObjects only — text is NEVER touched");
  console.log("⚠️  NO DATABASE CHANGES\n");

  let s3Client: S3Client | null = null;
  if (!isLocal && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
    console.log("✅ S3 client initialized\n");
  }

  try {
    const articles = await prisma.article.findMany({
      select: {
        id: true,
        title: true,
        originalPdfUrl: true,
        currentPdfUrl: true,
      },
    });

    const toProcess = articles.filter(
      (a: any) =>
        a.originalPdfUrl && a.originalPdfUrl.length > 0 &&
        a.currentPdfUrl && a.currentPdfUrl.length > 0
    );

    console.log(`📊 Total: ${articles.length} | To fix: ${toProcess.length}\n`);

    if (toProcess.length === 0) {
      console.log("✅ No articles to process.");
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const article = toProcess[i];
      const progress = `[${i + 1}/${toProcess.length}]`;

      try {
        console.log(`${progress}  "${article.title}" (${article.id})`);

        const isS3Url = article.currentPdfUrl.startsWith("http");
        let s3Key: string | null = null;
        if (isS3Url) {
          s3Key = extractS3Key(article.currentPdfUrl);
          if (!s3Key) { failCount++; continue; }
        }

        // 1. Download original PDF (has text + big watermark image)
        console.log(`${progress}  Downloading original PDF...`);
        let pdfBuffer: Buffer;
        if (article.originalPdfUrl.startsWith("http://") || article.originalPdfUrl.startsWith("https://")) {
          pdfBuffer = await downloadFileToBuffer(article.originalPdfUrl);
        } else {
          let filePath = article.originalPdfUrl;
          if (filePath.startsWith("/uploads")) filePath = path.join(process.cwd(), filePath);
          pdfBuffer = fs.readFileSync(filePath);
        }
        console.log(`${progress}    Size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

        // 2. Remove ONLY images from PDF (text stays intact)
        console.log(`${progress} 🧹 Removing images from PDF (text safe)...`);
        const cleanPdfBuffer = await removeImagesFromPdf(pdfBuffer);
        console.log(`${progress}    Clean: ${(cleanPdfBuffer.length / 1024).toFixed(1)} KB`);

        // 3. Upload clean PDF to S3
        if (s3Client && s3Key) {
          console.log(`${progress}  Uploading to S3: ${s3Key}`);
          await s3Client.send(new PutObjectCommand({
            Bucket: S3_BUCKET_ARTICLES,
            Key: s3Key,
            Body: cleanPdfBuffer,
            ContentType: "application/pdf",
          }));
          console.log(`${progress}  Done!\n`);
        } else if (!isS3Url) {
          let localPath = article.currentPdfUrl;
          if (localPath.startsWith("/uploads")) localPath = path.join(process.cwd(), localPath);
          fs.writeFileSync(localPath, cleanPdfBuffer);
          console.log(`${progress}  Done (local)!\n`);
        }

        successCount++;
      } catch (err: any) {
        console.error(`${progress}  Failed: ${err?.message || err}\n`);
        failCount++;
      }
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(` RE-WATERMARK v5 COMPLETE (NO DB CHANGES)`);
    console.log(` Success: ${successCount}`);
    console.log(` Failed:  ${failCount}`);
    console.log(`${"=".repeat(50)}`);
    console.log(`\n Download controller will add small logo at download time.`);
  } catch (error: any) {
    console.error(" Fatal:", error?.message || error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

reWatermarkArticles();
