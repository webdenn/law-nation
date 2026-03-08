import "dotenv/config";
import { prisma } from "../db/db.js";
import { addWatermarkToPdf } from "../utils/pdf-watermark.utils.js";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

/**
 * RE-WATERMARK SCRIPT: Fix old articles that have the big logo baked in.
 * 
 * ⚠️ NO DATABASE CHANGES - Only overwrites S3 files in-place.
 * 
 * What it does:
 * 1. Fetches article info from DB (READ ONLY)
 * 2. Downloads the ORIGINAL clean PDF (originalPdfUrl)
 * 3. Applies the NEW small logo watermark (scale 0.08, opacity 0.5)
 * 4. Overwrites the SAME S3 key used by currentPdfUrl
 *    → Database URL stays EXACTLY the same, no DB update needed
 */

const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";

const isLocal = process.env.NODE_ENV === "local";

/**
 * Extract the S3 storage key from a full S3 URL.
 * e.g. "https://law-nation.s3.ap-south-1.amazonaws.com/articles/12345.pdf"
 *   → "articles/12345.pdf"
 */
function extractS3Key(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Remove leading slash from pathname
    return urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;
  } catch {
    return null;
  }
}

async function reWatermarkArticles() {
  console.log("🚀 [Re-Watermark] Starting re-watermark process for old articles...");
  console.log("⚠️  [Re-Watermark] NO DATABASE CHANGES - Only S3 file overwrites\n");

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
    console.log("✅ [Re-Watermark] S3 client initialized\n");
  } else {
    console.log("⚠️ [Re-Watermark] Running in local mode (no S3)\n");
  }

  try {
    // 1. Fetch all articles (READ ONLY - we won't update anything)
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

    // Filter: must have originalPdfUrl AND currentPdfUrl
    const toProcess = articles.filter(
      (a: any) =>
        a.originalPdfUrl &&
        a.originalPdfUrl.length > 0 &&
        a.currentPdfUrl &&
        a.currentPdfUrl.length > 0
    );

    console.log(`📊 [Re-Watermark] Total articles: ${articles.length}`);
    console.log(`🔧 [Re-Watermark] Articles to re-watermark: ${toProcess.length}\n`);

    if (toProcess.length === 0) {
      console.log("✅ [Re-Watermark] No articles to process. Exiting.");
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const article = toProcess[i];
      const progress = `[${i + 1}/${toProcess.length}]`;

      try {
        console.log(`${progress} 📄 Processing: "${article.title}" (${article.id})`);
        console.log(`${progress}    Original PDF: ${article.originalPdfUrl}`);
        console.log(`${progress}    Current PDF:  ${article.currentPdfUrl}`);

        // 2. Figure out the S3 key of currentPdfUrl (to overwrite)
        const isS3Url = article.currentPdfUrl.startsWith("http");
        let s3Key: string | null = null;

        if (isS3Url) {
          s3Key = extractS3Key(article.currentPdfUrl);
          if (!s3Key) {
            console.log(`${progress} ⏭️ Skipped: Could not extract S3 key from URL`);
            skipCount++;
            continue;
          }
          console.log(`${progress}    S3 Key: ${s3Key}`);
        }

        // 3. Download the ORIGINAL clean PDF (no watermark)
        console.log(`${progress} 📥 Downloading original clean PDF...`);
        let originalPdfBuffer: Buffer;

        if (article.originalPdfUrl.startsWith("http://") || article.originalPdfUrl.startsWith("https://")) {
          originalPdfBuffer = await downloadFileToBuffer(article.originalPdfUrl);
        } else {
          let filePath = article.originalPdfUrl;
          if (filePath.startsWith("/uploads")) {
            filePath = path.join(process.cwd(), filePath);
          }
          originalPdfBuffer = fs.readFileSync(filePath);
        }

        console.log(`${progress}    Original PDF size: ${(originalPdfBuffer.length / 1024).toFixed(1)} KB`);

        // 4. Save to temp file for watermarking
        const tempDir = path.join(process.cwd(), "uploads", "temp");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempFilePath = path.join(tempDir, `rewatermark-${article.id}-${Date.now()}.pdf`);
        fs.writeFileSync(tempFilePath, originalPdfBuffer);

        // 5. Apply NEW watermark with small logo
        console.log(`${progress} 💧 Applying new small logo watermark...`);
        const watermarkedBuffer = await addWatermarkToPdf(
          tempFilePath,
          {
            userName: "LAW NATION",
            downloadDate: new Date(),
            articleTitle: article.title,
            articleId: article.id,
            articleSlug: article.slug || undefined,
            frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
          },
          "ADMIN",
          "DRAFT"
        );

        console.log(`${progress}    Watermarked PDF size: ${(watermarkedBuffer.length / 1024).toFixed(1)} KB`);

        // 6. Overwrite the SAME S3 file (no database change needed!)
        if (s3Client && s3Key) {
          console.log(`${progress} ☁️ Overwriting S3 file at same key: ${s3Key}`);
          await s3Client.send(
            new PutObjectCommand({
              Bucket: S3_BUCKET_ARTICLES,
              Key: s3Key,
              Body: watermarkedBuffer,
              ContentType: "application/pdf",
            })
          );
          console.log(`${progress} ✅ Done! Overwritten at: ${article.currentPdfUrl}\n`);
        } else if (!isS3Url) {
          // Local mode: overwrite the local file
          let localPath = article.currentPdfUrl;
          if (localPath.startsWith("/uploads")) {
            localPath = path.join(process.cwd(), localPath);
          }
          fs.writeFileSync(localPath, watermarkedBuffer);
          console.log(`${progress} ✅ Done! Overwritten local file: ${article.currentPdfUrl}\n`);
        }

        // Cleanup temp file
        fs.unlinkSync(tempFilePath);
        successCount++;
      } catch (err: any) {
        console.error(`${progress} ❌ Failed: ${err?.message || err}\n`);
        failCount++;
      }
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`🏁 RE-WATERMARK COMPLETE (NO DATABASE CHANGES)`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed:  ${failCount}`);
    console.log(`⏭️ Skipped: ${skipCount}`);
    console.log(`${"=".repeat(50)}`);
  } catch (error: any) {
    console.error("❌ [Re-Watermark] Fatal error:", error?.message || error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Run
reWatermarkArticles();
