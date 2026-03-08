import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import { PDFDocument, PDFName, PDFArray, PDFRef } from "pdf-lib";
import fs from "fs";
import path from "path";

/**
 * RE-WATERMARK SCRIPT v4: Direct PDF watermark removal.
 * 
 * How it works:
 * - When pdf-lib adds a watermark via drawImage(), it creates a NEW content stream
 *   and appends it to the page's Contents array.
 * - Original PDF content = first stream(s)
 * - Watermark overlay = last stream(s) added by pdf-lib
 * - We remove the LAST content stream from each page, stripping the watermark
 *   while preserving the original document perfectly.
 * 
 * ⚠️ NO DATABASE CHANGES - Only overwrites S3 PDF files in-place.
 * ⚠️ NO DOCX CONVERSION - Works directly on PDF, no formatting issues.
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
 * Remove watermark from a PDF by stripping the last content stream(s) 
 * added by pdf-lib's drawImage() on each page.
 */
async function stripWatermarkFromPdf(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  console.log(`   � PDF has ${pages.length} pages`);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageNode = page.node;

    // Get the Contents entry (can be a single stream ref or an array of refs)
    const contentsEntry = pageNode.get(PDFName.of("Contents"));

    if (contentsEntry instanceof PDFArray) {
      const streamCount = contentsEntry.size();
      
      if (streamCount > 1) {
        // pdf-lib appends new content streams at the end
        // The LAST stream(s) contain the watermark
        // Keep only the FIRST stream (original content)
        
        // Find how many streams were added by watermarking
        // Typically pdf-lib adds 1 stream per drawImage/drawText call batch
        // We remove the last stream(s) — anything after the original content
        
        // The original PDF typically has 1 content stream
        // Watermark adds 1-2 more streams (depending on how many elements)
        // We keep only the first stream
        const originalStreamRef = contentsEntry.get(0);
        
        // Create new array with only the original stream
        const newContents = pdfDoc.context.obj([originalStreamRef]);
        pageNode.set(PDFName.of("Contents"), newContents);
        
        console.log(`   Page ${i + 1}: Removed ${streamCount - 1} watermark stream(s) (kept 1/${streamCount})`);
      } else {
        console.log(`   Page ${i + 1}: Only 1 content stream (may be merged, skipping)`);
      }
    } else if (contentsEntry instanceof PDFRef) {
      // Single stream reference — content might be merged, can't easily split
      console.log(`   Page ${i + 1}: Single content stream (merged, skipping)`);
    } else {
      console.log(`   Page ${i + 1}: Unknown content type, skipping`);
    }
  }

  // Save the modified PDF
  const cleanedPdfBytes = await pdfDoc.save();
  return Buffer.from(cleanedPdfBytes);
}

async function reWatermarkArticles() {
  console.log("🚀 [Re-Watermark v4] Direct PDF watermark removal");
  console.log("📋 Removes last content stream(s) from each page");
  console.log("⚠️  NO DATABASE CHANGES | NO DOCX CONVERSION\n");

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
        slug: true,
        status: true,
        originalPdfUrl: true,
        currentPdfUrl: true,
      },
    });

    const toProcess = articles.filter(
      (a: any) =>
        a.originalPdfUrl &&
        a.originalPdfUrl.length > 0 &&
        a.currentPdfUrl &&
        a.currentPdfUrl.length > 0
    );

    console.log(`📊 Total articles: ${articles.length}`);
    console.log(`🔧 Articles to fix: ${toProcess.length}\n`);

    if (toProcess.length === 0) {
      console.log("✅ No articles to process.");
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const article = toProcess[i];
      const progress = `[${i + 1}/${toProcess.length}]`;

      try {
        console.log(`${progress} 📄 "${article.title}" (${article.id})`);

        const isS3Url = article.currentPdfUrl.startsWith("http");
        let s3Key: string | null = null;
        if (isS3Url) {
          s3Key = extractS3Key(article.currentPdfUrl);
          if (!s3Key) {
            console.log(`${progress} ⏭️ Skipped: Bad S3 URL`);
            skipCount++;
            continue;
          }
        }

        // 1. Download ORIGINAL PDF (has watermark baked in by upload middleware)
        console.log(`${progress} 📥 Downloading original PDF...`);
        let pdfBuffer: Buffer;

        if (article.originalPdfUrl.startsWith("http://") || article.originalPdfUrl.startsWith("https://")) {
          pdfBuffer = await downloadFileToBuffer(article.originalPdfUrl);
        } else {
          let filePath = article.originalPdfUrl;
          if (filePath.startsWith("/uploads")) {
            filePath = path.join(process.cwd(), filePath);
          }
          pdfBuffer = fs.readFileSync(filePath);
        }

        console.log(`${progress}    Original PDF: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

        // 2. Strip watermark by removing last content stream(s) from PDF
        console.log(`${progress} 🧹 Stripping watermark from PDF...`);
        const cleanPdfBuffer = await stripWatermarkFromPdf(pdfBuffer);
        console.log(`${progress}    Clean PDF: ${(cleanPdfBuffer.length / 1024).toFixed(1)} KB`);

        // 3. Upload clean PDF to S3 (overwrite currentPdfUrl)
        if (s3Client && s3Key) {
          console.log(`${progress} ☁️ Uploading to S3: ${s3Key}`);
          await s3Client.send(
            new PutObjectCommand({
              Bucket: S3_BUCKET_ARTICLES,
              Key: s3Key,
              Body: cleanPdfBuffer,
              ContentType: "application/pdf",
            })
          );
          console.log(`${progress} ✅ Done!\n`);
        } else if (!isS3Url) {
          let localPath = article.currentPdfUrl;
          if (localPath.startsWith("/uploads")) {
            localPath = path.join(process.cwd(), localPath);
          }
          fs.writeFileSync(localPath, cleanPdfBuffer);
          console.log(`${progress} ✅ Done (local)!\n`);
        }

        successCount++;
      } catch (err: any) {
        console.error(`${progress} ❌ Failed: ${err?.message || err}\n`);
        failCount++;
      }
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`🏁 RE-WATERMARK v4 COMPLETE (NO DB CHANGES)`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed:  ${failCount}`);
    console.log(`⏭️ Skipped: ${skipCount}`);
    console.log(`${"=".repeat(50)}`);
    console.log(`\n💡 Download controller will add small logo at download time.`);
  } catch (error: any) {
    console.error("❌ Fatal error:", error?.message || error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

reWatermarkArticles();
