import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { adobeService } from "../services/adobe.service.js";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

/**
 * RE-WATERMARK SCRIPT v3: Strip watermark images from DOCX then convert to clean PDF.
 * 
 * Problem: DOCX files have the watermark logo image baked in (from Adobe PDF→DOCX conversion).
 * Solution: Open DOCX as ZIP, remove logo images from word/media/, fix XML references, 
 *           then convert cleaned DOCX → clean PDF.
 * 
 * ⚠️ NO DATABASE CHANGES - Only overwrites S3 PDF files in-place.
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
 * Remove watermark images from a DOCX file.
 * DOCX is a ZIP file. The watermark logo is stored as an image in word/media/.
 * We remove image references from the document XML and delete the image files.
 */
async function stripWatermarkFromDocx(docxBuffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(docxBuffer);

  // 1. Find all images in word/media/
  const mediaFiles = Object.keys(zip.files).filter(
    (name) => name.startsWith("word/media/") && !zip.files[name].dir
  );

  console.log(`   � Found ${mediaFiles.length} media files in DOCX`);

  if (mediaFiles.length === 0) {
    console.log(`   ⚠️ No media files found - returning original DOCX`);
    return docxBuffer;
  }

  // 2. Read the logo-bg.png to compare (find logo images by size/content)
  // We'll remove ALL images that look like the watermark logo
  // The logo-bg.png is typically a small-medium sized PNG
  const imagesToRemove: string[] = [];
  const imageRelIds: string[] = [];

  for (const mediaFile of mediaFiles) {
    const fileData = await zip.file(mediaFile)?.async("nodebuffer");
    if (!fileData) continue;

    // Check if this is a PNG image (watermark logo is PNG)
    const isPng = fileData[0] === 0x89 && fileData[1] === 0x50 && fileData[2] === 0x4e && fileData[3] === 0x47;
    
    if (isPng) {
      console.log(`   🖼️ Found PNG image: ${mediaFile} (${(fileData.length / 1024).toFixed(1)} KB)`);
      imagesToRemove.push(mediaFile);
    }
  }

  if (imagesToRemove.length === 0) {
    console.log(`   ⚠️ No PNG images found to remove`);
    return docxBuffer;
  }

  // 3. Find relationship IDs for these images in word/_rels/document.xml.rels
  const relsPath = "word/_rels/document.xml.rels";
  const relsFile = zip.file(relsPath);
  
  if (relsFile) {
    let relsXml = await relsFile.async("string");
    
    for (const imgPath of imagesToRemove) {
      // Extract relative path from word/ perspective
      const relativePath = imgPath.replace("word/", "");
      
      // Find the relationship ID for this image
      const relRegex = new RegExp(
        `<Relationship[^>]*Target="${relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*Id="([^"]*)"[^>]*/>`,
        "g"
      );
      const match = relRegex.exec(relsXml);
      if (match) {
        imageRelIds.push(match[1]);
        console.log(`   🔗 Found relationship: ${match[1]} → ${relativePath}`);
      }

      // Remove the relationship entry
      relsXml = relsXml.replace(
        new RegExp(
          `<Relationship[^>]*Target="${relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*/>`,
          "g"
        ),
        ""
      );
    }
    
    zip.file(relsPath, relsXml);
  }

  // 4. Remove image references from document.xml
  const docPath = "word/document.xml";
  const docFile = zip.file(docPath);
  
  if (docFile) {
    let docXml = await docFile.async("string");
    
    for (const relId of imageRelIds) {
      // Remove <w:drawing> elements that reference this image
      // Pattern: <w:drawing>...<a:blip r:embed="rId..."/>...</w:drawing>
      const drawingRegex = new RegExp(
        `<w:drawing>[\\s\\S]*?<a:blip[^>]*r:embed="${relId}"[^>]*/>[\\s\\S]*?</w:drawing>`,
        "g"
      );
      docXml = docXml.replace(drawingRegex, "");
      
      // Also try inline pattern
      const inlineRegex = new RegExp(
        `<w:drawing>[\\s\\S]*?r:embed="${relId}"[\\s\\S]*?</w:drawing>`,
        "g"
      );
      docXml = docXml.replace(inlineRegex, "");
    }
    
    zip.file(docPath, docXml);
  }

  // 5. Also check headers (watermarks are often in headers)
  const headerFiles = Object.keys(zip.files).filter(
    (name) => name.startsWith("word/header") && name.endsWith(".xml")
  );
  
  for (const headerPath of headerFiles) {
    const headerFile = zip.file(headerPath);
    if (!headerFile) continue;
    
    let headerXml = await headerFile.async("string");
    
    for (const relId of imageRelIds) {
      const drawingRegex = new RegExp(
        `<w:drawing>[\\s\\S]*?r:embed="${relId}"[\\s\\S]*?</w:drawing>`,
        "g"
      );
      headerXml = headerXml.replace(drawingRegex, "");
    }
    
    // Also check header-specific rels
    const headerRelsPath = `word/_rels/${path.basename(headerPath)}.rels`;
    const headerRelsFile = zip.file(headerRelsPath);
    if (headerRelsFile) {
      let headerRelsXml = await headerRelsFile.async("string");
      for (const imgPath of imagesToRemove) {
        const relativePath = imgPath.replace("word/", "");
        headerRelsXml = headerRelsXml.replace(
          new RegExp(
            `<Relationship[^>]*Target="${relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*/>`,
            "g"
          ),
          ""
        );
      }
      zip.file(headerRelsPath, headerRelsXml);
    }
    
    zip.file(headerPath, headerXml);
  }

  // 6. Delete the actual image files
  for (const imgPath of imagesToRemove) {
    zip.remove(imgPath);
    console.log(`   🗑️ Removed: ${imgPath}`);
  }

  console.log(`   ✅ Stripped ${imagesToRemove.length} watermark images`);

  // 7. Generate cleaned DOCX
  const cleanedBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  return cleanedBuffer;
}

async function reWatermarkArticles() {
  console.log("� [Re-Watermark v3] Strip watermark images from DOCX → clean PDF");
  console.log("⚠️  [Re-Watermark v3] NO DATABASE CHANGES\n");

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
        currentPdfUrl: true,
        currentWordUrl: true,
        originalWordUrl: true,
      },
    });

    const toProcess = articles.filter(
      (a: any) =>
        (a.currentWordUrl || a.originalWordUrl) &&
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

    const tempDir = path.join(process.cwd(), "uploads", "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    for (let i = 0; i < toProcess.length; i++) {
      const article = toProcess[i];
      const progress = `[${i + 1}/${toProcess.length}]`;

      try {
        console.log(`${progress} 📄 "${article.title}" (${article.id})`);

        const docxUrl = article.currentWordUrl || article.originalWordUrl;
        if (!docxUrl) {
          console.log(`${progress} ⏭️ Skipped: No DOCX`);
          skipCount++;
          continue;
        }

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

        // 1. Download DOCX
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

        console.log(`${progress}    DOCX size: ${(docxBuffer.length / 1024).toFixed(1)} KB`);

        // 2. Strip watermark images from DOCX
        console.log(`${progress} 🧹 Stripping watermark images from DOCX...`);
        const cleanedDocxBuffer = await stripWatermarkFromDocx(docxBuffer);
        console.log(`${progress}    Cleaned DOCX size: ${(cleanedDocxBuffer.length / 1024).toFixed(1)} KB`);

        // 3. Save cleaned DOCX to temp
        const tempDocxPath = path.join(tempDir, `clean-${article.id}-${Date.now()}.docx`);
        const tempPdfPath = path.join(tempDir, `clean-${article.id}-${Date.now()}.pdf`);
        fs.writeFileSync(tempDocxPath, cleanedDocxBuffer);

        // 4. Convert cleaned DOCX → clean PDF via Adobe
        console.log(`${progress} 🔄 Converting cleaned DOCX → PDF via Adobe...`);
        await adobeService.convertDocxToPdf(tempDocxPath, tempPdfPath);

        const cleanPdfBuffer = fs.readFileSync(tempPdfPath);
        console.log(`${progress}    Clean PDF: ${(cleanPdfBuffer.length / 1024).toFixed(1)} KB`);

        // 5. Upload clean PDF to S3
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

        // Cleanup
        try { fs.unlinkSync(tempDocxPath); } catch {}
        try { fs.unlinkSync(tempPdfPath); } catch {}

        successCount++;

        // Rate limit delay
        if (i < toProcess.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (err: any) {
        console.error(`${progress} ❌ Failed: ${err?.message || err}\n`);
        failCount++;
      }
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`🏁 RE-WATERMARK v3 COMPLETE (NO DB CHANGES)`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed:  ${failCount}`);
    console.log(`⏭️ Skipped: ${skipCount}`);
    console.log(`${"=".repeat(50)}`);
  } catch (error: any) {
    console.error("❌ Fatal error:", error?.message || error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

reWatermarkArticles();
