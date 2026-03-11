import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { PDFDocument, rgb } from "pdf-lib"; // Standard way
import AdmZip from "adm-zip";
import { Readable } from "stream";

const s3Client = new S3Client({ region: process.env.AWS_REGION || "ap-south-1" });
const S3_BUCKET = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";

// ─── HELPER: STREAM TO BUFFER ────────────────────────────────────────
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// ─── PDF FIX: MASKING LOGIC ──────────────────────────────────────────
// Agar logo top-right ya bottom mein hai, toh yahan coordinates set karein
async function maskPdfLogo(pdfBuffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  pages.forEach((page) => {
    const { width, height } = page.getSize();
    
    // 1. Top Watermark/Logo Hide (Adjust values as per your logo)
    page.drawRectangle({
      x: 0,
      y: height - 60, // Top se 60 units
      width: width,
      height: 60,
      color: rgb(1, 1, 1), // Pure White
    });

    // 2. Bottom Watermark Hide
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: 40,
      color: rgb(1, 1, 1),
    });
  });

  return Buffer.from(await pdfDoc.save());
}

// ─── DOCX FIX: HEADER/FOOTER PURGE ───────────────────────────────────
function purgeDocxDeep(buffer) {
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    let changed = false;

    entries.forEach((entry) => {
      // DOCX mein watermarks/logos aksar header aur footer files mein hote hain
      if (entry.entryName.includes("word/header") || entry.entryName.includes("word/footer") || entry.entryName.includes("word/document.xml")) {
        let content = entry.getData().toString("utf-8");
        
        const originalContent = content;
        // Remove VML Shapes, Drawings, and specific Text
        content = content.replace(/<w:headerReference[^>]*\/>/g, ""); // Remove header ref
        content = content.replace(/<v:shape[^>]*>[\s\S]*?<\/v:shape>/gi, ""); 
        content = content.replace(/<wp:anchor[^>]*>[\s\S]*?<\/wp:anchor>/gi, "");
        content = content.replace(/Downloaded from.*?\b/gi, "");

        if (content !== originalContent) {
          zip.updateFile(entry.entryName, Buffer.from(content, "utf-8"));
          changed = true;
        }
      }
    });

    return changed ? zip.toBuffer() : buffer;
  } catch (err) {
    console.error("DOCX Error:", err.message);
    return buffer;
  }
}

// ─── MAIN LOGIC ──────────────────────────────────────────────────────
async function runPurge() {
  const articles = await prisma.article.findMany();
  console.log(`🚀 Starting purge for ${articles.length} articles...`);

  for (const article of articles) {
    try {
      // --- PDF Handle ---
      if (article.currentPdfUrl) {
        const key = new URL(article.currentPdfUrl).pathname.slice(1);
        const res = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
        const buf = await streamToBuffer(res.Body);
        
        const cleanedPdf = await maskPdfLogo(buf);
        
        await s3Client.send(new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: cleanedPdf,
          ContentType: "application/pdf"
        }));
      }

      // --- DOCX Handle ---
      if (article.currentWordUrl) {
        const key = new URL(article.currentWordUrl).pathname.slice(1);
        const res = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
        const buf = await streamToBuffer(res.Body);

        const cleanedDocx = purgeDocxDeep(buf);

        await s3Client.send(new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: cleanedDocx,
          ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        }));
      }
      console.log(`✅ Fixed: ${article.title}`);
    } catch (err) {
      console.error(`❌ Failed ${article.title}:`, err.message);
    }
  }
}

runPurge();