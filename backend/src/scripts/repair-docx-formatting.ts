import "dotenv/config";
import { prisma } from "../db/db.js";
import { adobeService } from "../services/adobe.service.js";
import { uploadToS3 } from "../utils/file-conversion.utils.js";
import path from "path";
import fs from "fs/promises";

/**
 * REPAIR SCRIPT: Fix corrupted DOCX formatting for existing articles.
 * Regenerates high-quality DOCX files from original PDFs via Adobe.
 */
async function repairFormatting() {
  console.log("🚀 [Repair] Starting DOCX formatting repair process...\n");

  try {
    // 1. Fetch ALL articles
    const articles = await prisma.article.findMany({
      select: {
        id: true,
        title: true,
        originalPdfUrl: true,
        currentWordUrl: true,
      },
    });

    // 2. Filter only those with a valid originalPdfUrl
    const toRepair = articles.filter(
      (a: any) => a.originalPdfUrl && a.originalPdfUrl.length > 0
    );

    console.log(`📊 [Repair] Total articles: ${articles.length}`);
    console.log(`🔧 [Repair] Articles with original PDF (to repair): ${toRepair.length}\n`);

    if (toRepair.length === 0) {
      console.log("✅ [Repair] No articles to repair. Exiting.");
      return;
    }

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (let i = 0; i < toRepair.length; i++) {
      const article = toRepair[i];
      const progress = `[${i + 1}/${toRepair.length}]`;

      try {
        console.log(`${progress} 📄 Processing: "${article.title}" (${article.id})`);

        if (!article.originalPdfUrl) {
          console.log(`${progress} ⏭️ Skipped: No original PDF URL`);
          skipCount++;
          continue;
        }

        // Create temp directory
        const tempDir = path.join(process.cwd(), "uploads", "temp");
        await fs.mkdir(tempDir, { recursive: true });
        const tempDocxPath = path.join(tempDir, `repaired-${article.id}-${Date.now()}.docx`);

        // Convert PDF to DOCX via Adobe
        console.log(`${progress} 🔄 Converting PDF to DOCX via Adobe...`);
        await adobeService.convertPdfToDocx(article.originalPdfUrl, tempDocxPath);

        // Upload to S3
        console.log(`${progress} ☁️ Uploading repaired file to S3...`);
        const uploadResult = await uploadToS3(tempDocxPath, article.originalPdfUrl);

        // Update database
        await prisma.article.update({
          where: { id: article.id },
          data: { currentWordUrl: uploadResult.url },
        });

        // Cleanup temp file
        await fs.unlink(tempDocxPath).catch(() => {});

        console.log(`${progress} ✅ Done! New URL: ${uploadResult.url}\n`);
        successCount++;
      } catch (err: any) {
        console.error(`${progress} ❌ Failed: ${err?.message || err}\n`);
        failCount++;
      }
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`🏁 REPAIR COMPLETE`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed:  ${failCount}`);
    console.log(`⏭️ Skipped: ${skipCount}`);
    console.log(`${"=".repeat(50)}`);
  } catch (error: any) {
    console.error("❌ [Repair] Fatal error:", error?.message || error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Run
repairFormatting();
