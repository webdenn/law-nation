import { prisma } from "../db/db.js";
import { adobeService } from "../services/adobe.service.js";
import { uploadToS3 } from "../utils/file-conversion.utils.js";
import path from "path";
import fs from "fs/promises";
import { resolveToAbsolutePath } from "../utils/file-path.utils.js";

/**
 * REPAIR SCRIPT: Fix corrupted DOCX formatting
 * This script regenerates high-quality DOCX files from original PDFs
 * for all articles that were previously processed with destructive code.
 */
async function repairFormatting() {
  console.log("🚀 [Repair] Starting DOCX formatting repair process...");

  try {
    // 1. Find all articles that have an original PDF
    const articles = await prisma.article.findMany({
      where: {
        originalPdfUrl: { not: null },
        OR: [
          { contentType: "ARTICLE" },
          { contentType: "DOCUMENT" }
        ]
      },
      select: {
        id: true,
        title: true,
        originalPdfUrl: true,
        currentWordUrl: true
      }
    });

    console.log(`📊 [Repair] Found ${articles.length} articles to check/repair.`);

    let successCount = 0;
    let failCount = 0;

    for (const article of articles) {
      try {
        console.log(`\n📄 [Repair] Processing article: "${article.title}" (${article.id})`);
        
        if (!article.originalPdfUrl) continue;

        // Construct a safe temp path for the nexly generated DOCX
        const tempDir = path.join(process.cwd(), "uploads", "temp");
        await fs.mkdir(tempDir, { recursive: true });
        const tempDocxPath = path.join(tempDir, `repaired-${article.id}-${Date.now()}.docx`);

        console.log(`🔄 [Repair] Regenerating high-quality DOCX from: ${article.originalPdfUrl}`);
        
        // 2. Convert PDF to high-quality DOCX via Adobe (uses the fixed non-destructive pipeline)
        await adobeService.convertPdfToDocx(article.originalPdfUrl, tempDocxPath);

        console.log(`☁️ [Repair] Uploading repaired file to S3...`);
        
        // 3. Upload the repaired file to S3
        const uploadResult = await uploadToS3(tempDocxPath, article.originalPdfUrl);
        
        console.log(`💾 [Repair] Updating database with new Word URL: ${uploadResult.url}`);

        // 4. Update the database record
        await prisma.article.update({
          where: { id: article.id },
          data: {
            currentWordUrl: uploadResult.url
          }
        });

        // 5. Cleanup temp file
        await fs.unlink(tempDocxPath).catch(() => {});

        console.log(`✅ [Repair] Successfully repaired: ${article.id}`);
        successCount++;
      } catch (err: any) {
        console.error(`❌ [Repair] Failed to repair article ${article.id}:`, err.message);
        failCount++;
      }
    }

    console.log(`\n🏁 [Repair] Finished!`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);

  } catch (error) {
    console.error("❌ [Repair] Fatal error during repair process:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
repairFormatting();
