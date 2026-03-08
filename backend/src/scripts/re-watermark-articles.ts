import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import fs from "fs";
import path from "path";

/**
 * EMERGENCY RESTORE: Copy originalPdfUrl content back to currentPdfUrl S3 key.
 * This restores articles to their original state (with the old watermark).
 * 
 * ⚠️ NO DATABASE CHANGES - Only overwrites S3 PDF files.
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

async function restoreArticles() {
  console.log("🚨 [EMERGENCY RESTORE] Copying originalPdfUrl → currentPdfUrl");
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

    console.log(`📊 Total: ${articles.length} | To restore: ${toProcess.length}\n`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const article = toProcess[i];
      const progress = `[${i + 1}/${toProcess.length}]`;

      try {
        console.log(`${progress} 📄 "${article.title}"`);

        const isS3Url = article.currentPdfUrl.startsWith("http");
        let s3Key: string | null = null;
        if (isS3Url) {
          s3Key = extractS3Key(article.currentPdfUrl);
          if (!s3Key) { failCount++; continue; }
        }

        // Download original PDF (untouched, has all text)
        let pdfBuffer: Buffer;
        if (article.originalPdfUrl.startsWith("http://") || article.originalPdfUrl.startsWith("https://")) {
          pdfBuffer = await downloadFileToBuffer(article.originalPdfUrl);
        } else {
          let filePath = article.originalPdfUrl;
          if (filePath.startsWith("/uploads")) filePath = path.join(process.cwd(), filePath);
          pdfBuffer = fs.readFileSync(filePath);
        }

        // Upload directly to currentPdfUrl S3 key (no processing)
        if (s3Client && s3Key) {
          await s3Client.send(new PutObjectCommand({
            Bucket: S3_BUCKET_ARTICLES,
            Key: s3Key,
            Body: pdfBuffer,
            ContentType: "application/pdf",
          }));
          console.log(`${progress} ✅ Restored (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
        } else if (!isS3Url) {
          let localPath = article.currentPdfUrl;
          if (localPath.startsWith("/uploads")) localPath = path.join(process.cwd(), localPath);
          fs.writeFileSync(localPath, pdfBuffer);
          console.log(`${progress} ✅ Restored locally`);
        }

        successCount++;
      } catch (err: any) {
        console.error(`${progress} ❌ Failed: ${err?.message || err}`);
        failCount++;
      }
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`🏁 RESTORE COMPLETE`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed:  ${failCount}`);
    console.log(`${"=".repeat(50)}`);
  } catch (error: any) {
    console.error("❌ Fatal:", error?.message || error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

restoreArticles();
