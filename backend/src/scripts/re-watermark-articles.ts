import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import { PDFDocument, PDFName, PDFDict, PDFRef, PDFStream, PDFRawStream } from "pdf-lib";
import fs from "fs";
import path from "path";
import { adobeService } from "../services/adobe.service.js";

/**
 * RE-WATERMARK SCRIPT v10: THE NUCLEAR OPTION
 * 
 * 1. Overwrites BOTH Current and Original PDFs in S3.
 * 2. Removes EVERYTHING except text from the PDF (Images, Forms, Layers, Patterns).
 * 3. Rewrites Content Streams to remove all Draw Object (Do) calls.
 * 4. Syncs cleaned PDF back to Word (DOCX).
 */

const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";

const isLocal = process.env.NODE_ENV === "local";

function extractS3Key(url: string | null): string | null {
  if (!url) return null;
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
  
  // Nuclear Step 1: Remove Document-level layers and transparency groups
  pdfDoc.catalog.delete(PDFName.of("OCProperties")); // Optional Content (Layers)
  pdfDoc.catalog.delete(PDFName.of("Metadata"));     // Possible hidden metadata

  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    
    // 1. Remove ALL Annotations
    page.node.delete(PDFName.of("Annots"));

    // 2. Clear Resources Dictionary
    const resources = page.node.get(PDFName.of("Resources"));
    if (resources instanceof PDFDict) {
      // Clear ALL XObjects (This removes all images and forms/watermarks)
      resources.delete(PDFName.of("XObject"));
      
      // Clear Patterns, Properties, and Graphic States
      resources.delete(PDFName.of("Pattern"));
      resources.delete(PDFName.of("Properties"));
      resources.delete(PDFName.of("ExtGState"));
    }

    // 3. Scrub Content Streams (Remove all 'Do' operators)
    try {
      const contents = page.node.get(PDFName.of("Contents"));
      if (contents) {
        const contentRefs = Array.isArray(contents) ? contents : [contents];
        for (const ref of contentRefs) {
          const stream = pdfDoc.context.lookup(ref as PDFRef);
          if (stream instanceof PDFRawStream || stream instanceof PDFStream) {
            let text = Buffer.from((stream as any).contents).toString("latin1");
            // Aggressively remove any XObject drawing command: e.g. /Im1 Do or /Fm1 Do
            const anyDoRegex = /\/[A-Za-z0-9]+\s+Do/g; 
            if (anyDoRegex.test(text)) {
              text = text.replace(anyDoRegex, "");
              (stream as any).contents = Buffer.from(text, "latin1");
            }
          }
        }
      }
    } catch (err) {}
  }

  const cleanedPdfBytes = await pdfDoc.save();
  return Buffer.from(cleanedPdfBytes);
}

async function reWatermarkArticles() {
  console.log("🚀 [Re-Watermark v10] NUCLEAR CLEANUP (PDF & WORD)");
  console.log("📋 This version strips EVERYTHING except text to kill the big logo.");
  
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
        currentWordUrl: true,
      }
    });

    console.log(`📊 Processing ${articles.length} articles...\n`);

    let successCount = 0;

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const progress = `[${i + 1}/${articles.length}]`;
      const tempPdfPath = path.join(process.cwd(), 'uploads', 'temp', `clean-${article.id}.pdf`);
      const tempDocxPath = path.join(process.cwd(), 'uploads', 'temp', `clean-${article.id}.docx`);

      try {
        console.log(`${progress}  "${article.title}"`);
        let cleanPdfBuffer: Buffer | null = null;

        // Use original if available, otherwise current
        const pdfUrl = article.originalPdfUrl || article.currentPdfUrl;
        if (pdfUrl) {
          const pdfBuffer = await downloadFileToBuffer(pdfUrl);
          cleanPdfBuffer = await aggressivelyCleanPdf(pdfBuffer);
          console.log("   ☢️ Nuclear strip successful");
        }

        if (cleanPdfBuffer) {
          // 1. Overwrite PDF in S3
          const currentPdfKey = extractS3Key(article.currentPdfUrl);
          const originalPdfKey = extractS3Key(article.originalPdfUrl);

          if (s3Client) {
            if (currentPdfKey) {
              await s3Client.send(new PutObjectCommand({ 
                Bucket: S3_BUCKET_ARTICLES, Key: currentPdfKey, Body: cleanPdfBuffer, ContentType: "application/pdf" 
              }));
              console.log("   📤 Current PDF overwritten");
            }
            if (originalPdfKey && originalPdfKey !== currentPdfKey) {
              await s3Client.send(new PutObjectCommand({ 
                Bucket: S3_BUCKET_ARTICLES, Key: originalPdfKey, Body: cleanPdfBuffer, ContentType: "application/pdf" 
              }));
              console.log("   📤 Original PDF overwritten");
            }
          }

          // 2. Sync to DOCX (to fix Word download)
          if (article.originalWordUrl || article.currentWordUrl) {
            console.log("   🔄 Syncing clean PDF back to DOCX...");
            fs.writeFileSync(tempPdfPath, cleanPdfBuffer);
            try {
              await adobeService.convertPdfToDocx(tempPdfPath, tempDocxPath);
              const cleanWordBuffer = fs.readFileSync(tempDocxPath);

              const currentWordKey = extractS3Key(article.currentWordUrl);
              const originalWordKey = extractS3Key(article.originalWordUrl);

              if (s3Client) {
                if (currentWordKey) {
                  await s3Client.send(new PutObjectCommand({ 
                    Bucket: S3_BUCKET_ARTICLES, Key: currentWordKey, Body: cleanWordBuffer, ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                  }));
                  console.log("   📤 Current Word overwritten");
                }
                if (originalWordKey && originalWordKey !== currentWordKey) {
                  await s3Client.send(new PutObjectCommand({ 
                    Bucket: S3_BUCKET_ARTICLES, Key: originalWordKey, Body: cleanWordBuffer, ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                  }));
                  console.log("   📤 Original Word overwritten");
                }
              }
            } catch (docxErr: any) {
              console.error(`   ⚠️ Sync failed: ${docxErr.message}`);
            } finally {
              if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
              if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
            }
          }
          successCount++;
          console.log("   ✨ Done!\n");
        }
      } catch (err: any) {
        console.error(`   ❌ Failed: ${err.message}\n`);
      }
    }

    console.log(`\n✨ DONE! Nuclear v10 Complete. Success: ${successCount}`);
  } catch (error: any) {
    console.error(" Fatal Error:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

reWatermarkArticles();
