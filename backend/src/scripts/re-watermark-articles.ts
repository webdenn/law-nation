import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { adobeService } from "../services/adobe.service.js";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import fs from "fs";
import path from "path";

/**
 * RE-WATERMARK SCRIPT v2: Fix old articles by generating CLEAN PDFs from DOCX files.
 * 
 * Why DOCX? Because originalPdfUrl already has the big logo baked in from upload.
 * DOCX files don't have the baked-in PDF watermark logo.
 * 
 * Flow:
 * 1. For each article, get its DOCX file (currentWordUrl or originalWordUrl)
 * 2. Convert DOCX → clean PDF via Adobe (no watermark)
 * 3. Upload clean PDF to S3 (overwriting currentPdfUrl)
 * 4. Download controller will add the small logo at download time
 * 
 * ⚠️ NO DATABASE CHANGES - Only overwrites S3 PDF files in-place.
 */

const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";

const isLocal = process.env.NODE_ENV === "local";

/**
 * Extract the S3 storage key from a full S3 URL.
 */
function extractS3Key(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;
  } catch {
    return null;
  }
}

async function reWatermarkArticles() {
  console.log("🚀 [Re-Watermark v2] Starting DOCX → Clean PDF conversion...");
  console.log("📋 [Re-Watermark v2] DOCX → PDF → S3 (no baked-in watermark)");
  console.log("⚠️  [Re-Watermark v2] NO DATABASE CHANGES\n");

  // Initialize S3 client
  let s3Client: S3Client | null = null;
  if (!isLocal && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
    s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
    console.log("✅ [Re-Watermark v2] S3 client initialized\n");
  } else {
    console.log("⚠️ [Re-Watermark v2] Running in local mode\n");
  }

  try {
    // 1. Fetch all articles (READ ONLY)
    const articles = await prisma.article.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        originalPdfUrl: true,
        currentPdfUrl: true,
        currentWordUrl: true,
        originalWordUrl: true,
      },
    });

    // Filter: must have a DOCX source AND a currentPdfUrl to overwrite
    const toProcess = articles.filter(
      (a: any) =>
        (a.currentWordUrl || a.originalWordUrl) &&
        a.currentPdfUrl &&
        a.currentPdfUrl.length > 0
    );

    console.log(`📊 [Re-Watermark v2] Total articles: ${articles.length}`);
    console.log(`🔧 [Re-Watermark v2] Articles with DOCX (can fix): ${toProcess.length}`);

    const noDocx = articles.filter(
      (a: any) => !a.currentWordUrl && !a.originalWordUrl && a.currentPdfUrl
    );
    if (noDocx.length > 0) {
      console.log(`⚠️  [Re-Watermark v2] Articles WITHOUT DOCX (can't fix): ${noDocx.length}`);
      noDocx.forEach((a: any) => console.log(`   - "${a.title}" (${a.id})`));
    }
    console.log("");

    if (toProcess.length === 0) {
      console.log("✅ [Re-Watermark v2] No articles to process. Exiting.");
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    // Ensure temp directory exists
    const tempDir = path.join(process.cwd(), "uploads", "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    for (let i = 0; i < toProcess.length; i++) {
      const article = toProcess[i];
      const progress = `[${i + 1}/${toProcess.length}]`;

      try {
        console.log(`${progress} 📄 Processing: "${article.title}" (${article.id})`);

        // Pick best DOCX source: prefer currentWordUrl, fallback to originalWordUrl
        const docxUrl = article.currentWordUrl || article.originalWordUrl;
        if (!docxUrl) {
          console.log(`${progress} ⏭️ Skipped: No DOCX available`);
          skipCount++;
          continue;
        }

        console.log(`${progress}    DOCX source: ${docxUrl}`);
        console.log(`${progress}    Current PDF: ${article.currentPdfUrl}`);

        // Get S3 key to overwrite
        const isS3Url = article.currentPdfUrl.startsWith("http");
        let s3Key: string | null = null;

        if (isS3Url) {
          s3Key = extractS3Key(article.currentPdfUrl);
          if (!s3Key) {
            console.log(`${progress} ⏭️ Skipped: Could not extract S3 key`);
            skipCount++;
            continue;
          }
        }

        // 2. Download DOCX file to temp
        console.log(`${progress} 📥 Downloading DOCX...`);
        let docxBuffer: Buffer;

        if (docxUrl.startsWith("http://") || docxUrl.startsWith("https://")) {
          docxBuffer = await downloadFileToBuffer(docxUrl);
        } else {
          let filePath = docxUrl;
          if (filePath.startsWith("/uploads")) {
            filePath = path.join(process.cwd(), filePath);
          }
          docxBuffer = fs.readFileSync(filePath);
        }

        const tempDocxPath = path.join(tempDir, `fix-${article.id}-${Date.now()}.docx`);
        const tempPdfPath = path.join(tempDir, `fix-${article.id}-${Date.now()}.pdf`);
        fs.writeFileSync(tempDocxPath, docxBuffer);

        console.log(`${progress}    DOCX size: ${(docxBuffer.length / 1024).toFixed(1)} KB`);

        // 3. Convert DOCX → clean PDF via Adobe (NO watermark!)
        console.log(`${progress} 🔄 Converting DOCX → clean PDF via Adobe...`);
        await adobeService.convertDocxToPdf(tempDocxPath, tempPdfPath);

        const cleanPdfBuffer = fs.readFileSync(tempPdfPath);
        console.log(`${progress}    Clean PDF size: ${(cleanPdfBuffer.length / 1024).toFixed(1)} KB`);

        // 4. Upload clean PDF to S3 (overwrite same key - no DB change)
        if (s3Client && s3Key) {
          console.log(`${progress} ☁️ Uploading clean PDF to S3 at: ${s3Key}`);
          await s3Client.send(
            new PutObjectCommand({
              Bucket: S3_BUCKET_ARTICLES,
              Key: s3Key,
              Body: cleanPdfBuffer,
              ContentType: "application/pdf",
            })
          );
          console.log(`${progress} ✅ Done! Clean PDF at: ${article.currentPdfUrl}\n`);
        } else if (!isS3Url) {
          // Local mode
          let localPath = article.currentPdfUrl;
          if (localPath.startsWith("/uploads")) {
            localPath = path.join(process.cwd(), localPath);
          }
          fs.writeFileSync(localPath, cleanPdfBuffer);
          console.log(`${progress} ✅ Done! Local: ${article.currentPdfUrl}\n`);
        }

        // Cleanup temp files
        try { fs.unlinkSync(tempDocxPath); } catch {}
        try { fs.unlinkSync(tempPdfPath); } catch {}

        successCount++;

        // Small delay to avoid Adobe API rate limits
        if (i < toProcess.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (err: any) {
        console.error(`${progress} ❌ Failed: ${err?.message || err}\n`);
        failCount++;
      }
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`🏁 RE-WATERMARK v2 COMPLETE (NO DATABASE CHANGES)`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed:  ${failCount}`);
    console.log(`⏭️ Skipped: ${skipCount}`);
    console.log(`${"=".repeat(50)}`);
    console.log(`\n💡 Download controller will add small logo at download time.`);
  } catch (error: any) {
    console.error("❌ [Re-Watermark v2] Fatal error:", error?.message || error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Run
reWatermarkArticles();
