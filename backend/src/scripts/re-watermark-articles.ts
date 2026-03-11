import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFRef,
  PDFStream,
  PDFRawStream,
} from "pdf-lib";
import AdmZip from "adm-zip";

// ─── CONFIG ─────────────────────────────────────────
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";
const isLocal = process.env.NODE_ENV === "local";

// ─── WATERMARK SETTINGS ─────────────────────────────
const WM_CENTER_SIZE = "350pt";
const WM_OPACITY = "0.10";

// ─── PDF CLEANER ────────────────────────────────────
async function aggressivelyCleanPdf(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    ignoreEncryption: true,
    throwOnInvalidObject: false,
  });

  pdfDoc.catalog.delete(PDFName.of("OCProperties"));

  const pages = pdfDoc.getPages();

  for (const page of pages) {
    page.node.delete(PDFName.of("Annots"));

    const resources = page.node.get(PDFName.of("Resources"));

    if (resources instanceof PDFDict) {
      resources.delete(PDFName.of("XObject"));
      resources.delete(PDFName.of("Pattern"));
      resources.delete(PDFName.of("ExtGState"));
    }

    try {
      const contents = page.node.get(PDFName.of("Contents"));

      if (contents) {
        const contentRefs = Array.isArray(contents) ? contents : [contents];

        for (const ref of contentRefs) {
          const stream = pdfDoc.context.lookup(ref as PDFRef);

          if (stream instanceof PDFRawStream || stream instanceof PDFStream) {
            let text = Buffer.from((stream as any).contents).toString("latin1");

            const doRegex = /\/[A-Za-z0-9]+\s+Do/g;

            if (doRegex.test(text)) {
              text = text.replace(doRegex, "");
              (stream as any).contents = Buffer.from(text, "latin1");
            }
          }
        }
      }
    } catch (_) {}
  }

  return Buffer.from(await pdfDoc.save());
}

// ─── DOCX FIX ENGINE ───────────────────────────────
function cleanDocxBuffer(buffer: Buffer): Buffer {
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    let changed = false;

    for (const entry of entries) {
      if (entry.entryName !== "word/document.xml") continue;

      let content = entry.getData().toString("utf-8");
      let localModified = false;

      const vmlRegex =
        /(<(v:shape|v:rect|v:image|v:oval)[^>]*style=")([^"]*)(")([^>]*>)([\s\S]*?)(<\/\2>)/gi;

      let shapeIndex = 0;

      content = content.replace(
        vmlRegex,
        (match, start, tag, style, quote, mid, inner, end) => {
          shapeIndex++;

          let newStyle = style;

          if (shapeIndex === 1) {
            // Sirf center watermark rakho
            newStyle +=
              `;position:absolute;width:${WM_CENTER_SIZE};height:${WM_CENTER_SIZE};` +
              `mso-position-horizontal:center;mso-position-horizontal-relative:page;` +
              `mso-position-vertical:center;mso-position-vertical-relative:page;` +
              `opacity:${WM_OPACITY};filter:alpha(opacity=${parseFloat(
                WM_OPACITY
              ) * 100});`;

            localModified = true;
            return `${start}${newStyle}${quote}${mid}${inner}${end}`;
          }

          if (shapeIndex === 2) {
            // Chota logo hide karo - XML valid rakhne ke liye display:none aur width/height:0
            newStyle = newStyle
              .replace(/width:[^;"]*/gi, "width:0pt")
              .replace(/height:[^;"]*/gi, "height:0pt");
            newStyle += `;display:none;visibility:hidden;opacity:0;`;

            localModified = true;
            return `${start}${newStyle}${quote}${mid}${inner}${end}`;
          }

          return `${start}${newStyle}${quote}${mid}${inner}${end}`;
        }
      );

      if (localModified) {
        zip.updateFile(entry.entryName, Buffer.from(content, "utf-8"));
        changed = true;
      }
    }

    return changed ? zip.toBuffer() : buffer;
  } catch (err: any) {
    console.error("DOCX Fix Error:", err.message);
    return buffer;
  }
}

// ─── MAIN SCRIPT ───────────────────────────────────
async function reWatermarkArticles() {
  console.log("🚀 [Re-Watermark Stable Version]");

  const s3Client = isLocal ? null : new S3Client({ region: AWS_REGION });

  try {
    const articles = await prisma.article.findMany();

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];

      console.log(`[${i + 1}/${articles.length}] ${article.title}`);

      try {
        // PDF CLEAN
        const pdfUrl = article.originalPdfUrl || article.currentPdfUrl;

        if (pdfUrl) {
          const pdfBuffer = await downloadFileToBuffer(pdfUrl);
          const cleanPdf = await aggressivelyCleanPdf(pdfBuffer);

          const key = article.currentPdfUrl
            ? new URL(article.currentPdfUrl).pathname.slice(1)
            : null;

          if (s3Client && key) {
            await s3Client.send(
              new PutObjectCommand({
                Bucket: S3_BUCKET_ARTICLES,
                Key: key,
                Body: cleanPdf,
                ContentType: "application/pdf",
              })
            );

            console.log("✅ PDF Cleaned");
          }
        }

        // DOCX CLEAN
        const wordUrl = article.originalWordUrl || article.currentWordUrl;

        if (wordUrl) {
          const wordBuffer = await downloadFileToBuffer(wordUrl);
          const cleanWord = cleanDocxBuffer(wordBuffer);

          const key = article.currentWordUrl
            ? new URL(article.currentWordUrl).pathname.slice(1)
            : null;

          if (s3Client && key) {
            await s3Client.send(
              new PutObjectCommand({
                Bucket: S3_BUCKET_ARTICLES,
                Key: key,
                Body: cleanWord,
                ContentType:
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              })
            );

            console.log("✅ DOCX Cleaned");
          }
        }
      } catch (err: any) {
        console.error("❌ Failed:", err.message);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

reWatermarkArticles();