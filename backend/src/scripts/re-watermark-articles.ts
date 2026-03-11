import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import { PDFDocument, PDFName, PDFDict, PDFRef, PDFStream, PDFRawStream } from "pdf-lib";
import AdmZip from "adm-zip";

/**
 * RE-WATERMARK SCRIPT v12: FIXED CENTER WATERMARK
 *
 * Key Fixes:
 * 1. Proper EMU size for DrawingML (~6 inches = 5486400 EMU)
 * 2. Correct VML centering relative to PAGE (not margin)
 * 3. Handles BOTH VML (legacy) and DrawingML (modern) DOCX formats
 * 4. Lower EMU threshold to catch all watermark shapes
 * 5. Cleans PDF images/annotations as before
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";
const isLocal = process.env.NODE_ENV === "local";

// ─── WATERMARK SIZE CONSTANTS ─────────────────────────────────────────────────
// VML sizes (pt)
const WM_PT = 160;                    // 160pt ≈ 2.2 inches — Consistent global center watermark
const WM_CENTER = `${WM_PT}pt`;
const WM_CORNER = "160pt";             // Matching corner size for consistency

// DrawingML sizes (EMU: 1 inch = 914400 EMU)
const WM_EMU = 2032000;               // ~2.2 inches in EMU (Matching 160pt)
const WM_EMU_THRESHOLD = 300000;      // Any shape wider than ~0.33 inch is a candidate

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function extractS3Key(url: string | null): string | null {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;
  } catch {
    return null;
  }
}

// ─── PDF CLEANER ─────────────────────────────────────────────────────────────
async function aggressivelyCleanPdf(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    ignoreEncryption: true,
    throwOnInvalidObject: false,
  });

  pdfDoc.catalog.delete(PDFName.of("OCProperties"));

  const pages = pdfDoc.getPages();
  for (const page of pages) {
    // Remove annotations (links, stamps, watermark annotations)
    page.node.delete(PDFName.of("Annots"));

    // Remove XObject (images), Pattern, ExtGState from resources
    const resources = page.node.get(PDFName.of("Resources"));
    if (resources instanceof PDFDict) {
      resources.delete(PDFName.of("XObject"));
      resources.delete(PDFName.of("Pattern"));
      resources.delete(PDFName.of("ExtGState"));
    }

    // Scrub "Do" operators from content streams (removes image draw calls)
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
    } catch (_) {
      // Ignore individual stream errors
    }
  }

  return Buffer.from(await pdfDoc.save());
}

// ─── DOCX CLEANER ────────────────────────────────────────────────────────────
function cleanDocxBuffer(buffer: Buffer): Buffer {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    let changed = false;

    for (const entry of zipEntries) {
      // Only process XML files inside the word/ folder
      if (!entry.entryName.startsWith("word/") || !entry.entryName.endsWith(".xml")) {
        continue;
      }

      let content = entry.getData().toString("utf-8");
      let localModified = false;

      // ── STRATEGY 1: VML shapes (legacy Word format) ──────────────────────
      // Targets <v:shape>, <v:rect>, <v:image>, <v:oval> with a style attribute
      const vmlShapeRegex = /<(v:shape|v:rect|v:image|v:oval)(\s[^>]*)?>/gi;
      content = content.replace(vmlShapeRegex, (match, tag, attrs) => {
        if (!attrs) return match;

        // Only process shapes that have a style with width/height (likely a logo/watermark)
        if (!attrs.includes("width") && !attrs.includes("height")) return match;

        // Build the correct center watermark style
        const centerStyle = [
          "position:absolute",
          `width:${WM_CENTER}`,
          `height:${WM_CENTER}`,
          "mso-position-horizontal:center",
          "mso-position-horizontal-relative:page",   // relative to FULL PAGE
          "mso-position-vertical:center",
          "mso-position-vertical-relative:page",     // relative to FULL PAGE
          "mso-wrap-style:none",
          "z-index:251658240",
        ].join(";");

        // Replace existing style attribute entirely
        const newAttrs = attrs.replace(/style="[^"]*"/i, `style="${centerStyle}"`);

        // If no style attr existed at all, inject one
        const result = newAttrs.includes(`style="${centerStyle}"`)
          ? `<${tag}${newAttrs}>`
          : `<${tag}${attrs} style="${centerStyle}">`;

        localModified = true;
        return result;
      });

      // ── STRATEGY 2: DrawingML inline/anchor images (modern Word format) ──
      // wp:extent defines the visual size of the image in EMU
      const wpExtentRegex = /<wp:extent\s+cx="(\d+)"\s+cy="(\d+)"([^>]*?)\/>/gi;
      content = content.replace(wpExtentRegex, (match, cx, cy, otherAttrs) => {
        const valCx = parseInt(cx);
        const valCy = parseInt(cy);
        if (valCx > WM_EMU_THRESHOLD || valCy > WM_EMU_THRESHOLD) {
          localModified = true;
          // Keep aspect ratio
          const ratio = valCy / valCx;
          const newCy = Math.round(WM_EMU * ratio);
          return `<wp:extent cx="${WM_EMU}" cy="${newCy}"${otherAttrs}/>`;
        }
        return match;
      });

      // a:ext inside pic/spPr defines shape extents
      const aExtRegex = /<a:ext\s+cx="(\d+)"\s+cy="(\d+)"([^>]*?)\/>/gi;
      content = content.replace(aExtRegex, (match, cx, cy, otherAttrs) => {
        const valCx = parseInt(cx);
        const valCy = parseInt(cy);
        if (valCx > WM_EMU_THRESHOLD || valCy > WM_EMU_THRESHOLD) {
          localModified = true;
          const ratio = valCy / valCx;
          const newCy = Math.round(WM_EMU * ratio);
          return `<a:ext cx="${WM_EMU}" cy="${newCy}"${otherAttrs}/>`;
        }
        return match;
      });

      // ── STRATEGY 3: Fix wp:anchor positioning for DrawingML ──────────────
      // wp:anchor is used for floating images — force it to page-center
      // simplePos="0" means we control position manually
      const wpAnchorRegex = /(<wp:anchor\b[^>]*>)([\s\S]*?)(<\/wp:anchor>)/gi;
      content = content.replace(wpAnchorRegex, (match, open, inner, close) => {
        // Only touch anchors that contain a large image (already resized above)
        if (!inner.includes(`cx="${WM_EMU}"`) && !inner.includes("cx=")) return match;

        // Replace posOffset values to center on page
        // Standard A4 page: width=12240000 EMU, height=15840000 EMU
        // Center X offset = (12240000 - WM_EMU) / 2 ≈ 3376800
        // Center Y offset = (15840000 - WM_EMU) / 2 ≈ 5176800
        let newInner = inner
          .replace(/<wp:posOffset>(\d+)<\/wp:posOffset>/g, (m: string, val: string, offset: number) => {
            // First posOffset = horizontal, second = vertical
            const occurrences = (inner.slice(0, offset).match(/<wp:posOffset>/g) || []).length;
            if (occurrences === 0) return `<wp:posOffset>3376800</wp:posOffset>`; // X center
            if (occurrences === 1) return `<wp:posOffset>5176800</wp:posOffset>`; // Y center
            return m;
          })
          // Force relative horizontal/vertical anchoring to PAGE
          .replace(/(<wp:positionH\s+relativeFrom=")[^"]+(")/g, '$1page$2')
          .replace(/(<wp:positionV\s+relativeFrom=")[^"]+(")/g, '$1page$2');

        if (newInner !== inner) localModified = true;
        return `${open}${newInner}${close}`;
      });

      if (localModified) {
        zip.updateFile(entry.entryName, Buffer.from(content, "utf-8"));
        changed = true;
        console.log(`   ✏️  Modified: ${entry.entryName}`);
      }
    }

    return changed ? zip.toBuffer() : buffer;
  } catch (err: any) {
    console.error("   ⚠️ DOCX cleaning failed:", err.message);
    return buffer;
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function reWatermarkArticles() {
  console.log("🚀 [Re-Watermark v12] CENTER WATERMARK FIX — PDF + DOCX");

  let s3Client: S3Client | null = null;
  const bucketName = S3_BUCKET_ARTICLES;
  const region = AWS_REGION;

  if (!isLocal) {
    console.log(`☁️  S3 init (Region: ${region}, Bucket: ${bucketName})`);
    const s3Config: any = { region };
    if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
      console.log("🔑 Using credentials from .env");
      s3Config.credentials = {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      };
    } else {
      console.log("ℹ️  No keys in .env — falling back to IAM Role.");
    }
    s3Client = new S3Client(s3Config);
  } else {
    console.log("⚠️  NODE_ENV=local — S3 uploads SKIPPED.");
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
      },
    });

    console.log(`📊 Found ${articles.length} articles\n`);
    let successCount = 0;

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      const progress = `[${i + 1}/${articles.length}]`;

      try {
        console.log(`${progress} "${article.title}"`);

        // ── Clean PDF ──────────────────────────────────────────────────────
        const pdfUrl = article.originalPdfUrl || article.currentPdfUrl;
        if (pdfUrl) {
          const pdfBuffer = await downloadFileToBuffer(pdfUrl);
          const cleanPdf = await aggressivelyCleanPdf(pdfBuffer);

          const currentPdfKey = extractS3Key(article.currentPdfUrl);
          const originalPdfKey = extractS3Key(article.originalPdfUrl);

          if (s3Client) {
            if (currentPdfKey) {
              await s3Client.send(
                new PutObjectCommand({
                  Bucket: bucketName,
                  Key: currentPdfKey,
                  Body: cleanPdf,
                  ContentType: "application/pdf",
                })
              );
              console.log(`   📤 PDF → ${currentPdfKey}`);
            }
            if (originalPdfKey && originalPdfKey !== currentPdfKey) {
              await s3Client.send(
                new PutObjectCommand({
                  Bucket: bucketName,
                  Key: originalPdfKey,
                  Body: cleanPdf,
                  ContentType: "application/pdf",
                })
              );
              console.log(`   📤 Original PDF → ${originalPdfKey}`);
            }
          }
          console.log("   ✅ PDF cleaned");
        }

        // ── Clean DOCX ─────────────────────────────────────────────────────
        const wordUrl = article.originalWordUrl || article.currentWordUrl;
        if (wordUrl) {
          const wordBuffer = await downloadFileToBuffer(wordUrl);
          const cleanWord = cleanDocxBuffer(wordBuffer);

          const currentWordKey = extractS3Key(article.currentWordUrl);
          const originalWordKey = extractS3Key(article.originalWordUrl);

          if (s3Client) {
            if (currentWordKey) {
              await s3Client.send(
                new PutObjectCommand({
                  Bucket: bucketName,
                  Key: currentWordKey,
                  Body: cleanWord,
                  ContentType:
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                })
              );
              console.log(`   📤 DOCX → ${currentWordKey}`);
            }
            if (originalWordKey && originalWordKey !== currentWordKey) {
              await s3Client.send(
                new PutObjectCommand({
                  Bucket: bucketName,
                  Key: originalWordKey,
                  Body: cleanWord,
                  ContentType:
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                })
              );
              console.log(`   📤 Original DOCX → ${originalWordKey}`);
            }
          }
          console.log("   ✅ DOCX cleaned");
        }

        successCount++;
      } catch (err: any) {
        console.error(`   ❌ Failed: ${err.message}`);
      }
    }

    console.log(`\n✨ Done! v12 — Success: ${successCount}/${articles.length}`);
  } catch (error: any) {
    console.error("Fatal Error:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

reWatermarkArticles();