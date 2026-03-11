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

// ─── CLI ARG ─────────────────────────────────────────
// Usage:
//   npx ts-node apply-watermark.ts "My Article Title"  ← partial/full title match
//   npx ts-node apply-watermark.ts                     ← runs on ALL articles
const CLI_SEARCH = process.argv[2]?.trim() ?? null;

// ─── WATERMARK SETTINGS ─────────────────────────────
const WM_CENTER_WIDTH   = "400pt";
const WM_CENTER_HEIGHT  = "400pt";
const WM_CENTER_OPACITY = "0.10";

const WM_FOOTER_WIDTH   = "80pt";
const WM_FOOTER_HEIGHT  = "80pt";
const WM_FOOTER_OPACITY = "0.60";

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

// ─── HELPERS ────────────────────────────────────────
function detectShapeRole(style: string, inner: string): "center" | "footer" | "unknown" {
  const s = style.toLowerCase();

  const isCenterByPosition =
    s.includes("mso-position-horizontal:center") &&
    s.includes("mso-position-horizontal-relative:page") &&
    s.includes("mso-position-vertical:center") &&
    s.includes("mso-position-vertical-relative:page");

  const zMatch = s.match(/z-index:\s*(-?\d+)/);
  const zIndex = zMatch ? parseInt(zMatch[1]) : 0;
  const isCenterByZIndex = zIndex > 200_000_000;

  if (isCenterByPosition || isCenterByZIndex) return "center";

  const isFooterByPosition =
    !s.includes("mso-position-vertical-relative:page") ||
    s.includes("margin-left") ||
    s.includes("margin-top") ||
    (s.includes("position:absolute") && !isCenterByPosition);

  const hasImage = inner.toLowerCase().includes("v:imagedata");

  if (isFooterByPosition || hasImage) return "footer";

  return "unknown";
}

function buildCenterStyle(original: string): string {
  let s = original
    .replace(/width\s*:[^;"]*/gi, "")
    .replace(/height\s*:[^;"]*/gi, "")
    .replace(/opacity\s*:[^;"]*/gi, "")
    .replace(/filter\s*:[^;"]*/gi, "")
    .replace(/mso-position-horizontal\s*:[^;"]*/gi, "")
    .replace(/mso-position-horizontal-relative\s*:[^;"]*/gi, "")
    .replace(/mso-position-vertical\s*:[^;"]*/gi, "")
    .replace(/mso-position-vertical-relative\s*:[^;"]*/gi, "")
    .replace(/margin-left\s*:[^;"]*/gi, "")
    .replace(/margin-top\s*:[^;"]*/gi, "");

  const opacityPct = Math.round(parseFloat(WM_CENTER_OPACITY) * 100);

  s += [
    `width:${WM_CENTER_WIDTH}`,
    `height:${WM_CENTER_HEIGHT}`,
    `position:absolute`,
    `mso-position-horizontal:center`,
    `mso-position-horizontal-relative:page`,
    `mso-position-vertical:center`,
    `mso-position-vertical-relative:page`,
    `opacity:${WM_CENTER_OPACITY}`,
    `filter:alpha(opacity=${opacityPct})`,
  ].join(";");

  return s.replace(/;{2,}/g, ";").replace(/^;/, "");
}

function buildFooterStyle(original: string): string {
  let s = original
    .replace(/width\s*:[^;"]*/gi, "")
    .replace(/height\s*:[^;"]*/gi, "")
    .replace(/opacity\s*:[^;"]*/gi, "")
    .replace(/filter\s*:[^;"]*/gi, "")
    .replace(/mso-position-horizontal\s*:[^;"]*/gi, "")
    .replace(/mso-position-horizontal-relative\s*:[^;"]*/gi, "")
    .replace(/mso-position-vertical\s*:[^;"]*/gi, "")
    .replace(/mso-position-vertical-relative\s*:[^;"]*/gi, "")
    .replace(/margin-left\s*:[^;"]*/gi, "")
    .replace(/margin-top\s*:[^;"]*/gi, "")
    .replace(/display\s*:[^;"]*/gi, "")
    .replace(/visibility\s*:[^;"]*/gi, "");

  const opacityPct = Math.round(parseFloat(WM_FOOTER_OPACITY) * 100);

  s += [
    `width:${WM_FOOTER_WIDTH}`,
    `height:${WM_FOOTER_HEIGHT}`,
    `position:absolute`,
    `mso-position-horizontal:left`,
    `mso-position-horizontal-relative:page`,
    `mso-position-vertical:bottom`,
    `mso-position-vertical-relative:page`,
    `margin-left:20pt`,
    `margin-top:-${WM_FOOTER_HEIGHT}`,
    `opacity:${WM_FOOTER_OPACITY}`,
    `filter:alpha(opacity=${opacityPct})`,
    `display:block`,
    `visibility:visible`,
  ].join(";");

  return s.replace(/;{2,}/g, ";").replace(/^;/, "");
}

// ─── DOCX FIX ENGINE ────────────────────────────────
function applyWatermarkDocx(buffer: Buffer): Buffer {
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    let changed = false;

    for (const entry of entries) {
      const isTarget =
        entry.entryName === "word/document.xml" ||
        /^word\/(header|footer)\d*\.xml$/.test(entry.entryName);

      if (!isTarget) continue;

      let content = entry.getData().toString("utf-8");
      let localModified = false;

      const vmlRegex =
        /(<(v:shape|v:rect|v:image|v:oval)(\s[^>]*?)?style=")([^"]*)(">|"[^>]*>)([\s\S]*?)(<\/\2>)/gi;

      content = content.replace(
        vmlRegex,
        (_match, openPrefix, _tag, _attrs, style, openSuffix, inner, closeTag) => {
          const role = detectShapeRole(style, inner);

          if (role === "center") {
            localModified = true;
            console.log(`    → CENTER watermark applied`);
            return `${openPrefix}${buildCenterStyle(style)}${openSuffix}${inner}${closeTag}`;
          }

          if (role === "footer") {
            localModified = true;
            console.log(`    → FOOTER logo applied`);
            return `${openPrefix}${buildFooterStyle(style)}${openSuffix}${inner}${closeTag}`;
          }

          console.log(`    → UNKNOWN shape — skipped`);
          return _match;
        }
      );

      if (localModified) {
        zip.updateFile(entry.entryName, Buffer.from(content, "utf-8"));
        changed = true;
      }
    }

    return changed ? zip.toBuffer() : buffer;
  } catch (err: any) {
    console.error("DOCX Watermark Error:", err.message);
    return buffer;
  }
}

// ─── PROCESS ONE ARTICLE ────────────────────────────
async function processArticle(
  article: Awaited<ReturnType<typeof prisma.article.findMany>>[number],
  s3Client: S3Client | null,
  index: number,
  total: number
) {
  console.log(`\n[${index}/${total}] "${article.title}"`);

  // ── PDF ──────────────────────────────────────────
  const pdfUrl = article.originalPdfUrl || article.currentPdfUrl;

  if (pdfUrl) {
    const pdfBuffer = await downloadFileToBuffer(pdfUrl);
    const cleanPdf  = await aggressivelyCleanPdf(pdfBuffer);
    const key       = article.currentPdfUrl
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
      console.log("  ✅ PDF watermark applied & uploaded");
    } else {
      console.log("  ⚠️  PDF skipped (local mode or no key)");
    }
  }

  // ── DOCX ─────────────────────────────────────────
  const wordUrl = article.originalWordUrl || article.currentWordUrl;

  if (wordUrl) {
    const wordBuffer = await downloadFileToBuffer(wordUrl);
    const cleanWord  = applyWatermarkDocx(wordBuffer);
    const key        = article.currentWordUrl
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
      console.log("  ✅ DOCX watermark applied & uploaded");
    } else {
      console.log("  ⚠️  DOCX skipped (local mode or no key)");
    }
  }
}

// ─── MAIN ───────────────────────────────────────────
async function applyWatermarks() {
  console.log("💧 [Apply Watermarks — Center + Footer]\n");

  const s3Client = isLocal ? null : new S3Client({ region: AWS_REGION });

  try {
    let articles: Awaited<ReturnType<typeof prisma.article.findMany>>;

    if (CLI_SEARCH) {
      // ── Single / filtered mode ───────────────────
      console.log(`🔍 Searching for: "${CLI_SEARCH}"`);

      articles = await prisma.article.findMany({
        where: {
          title: {
            contains: CLI_SEARCH,
            mode: "insensitive",
          },
        },
      });

      if (articles.length === 0) {
        console.error(`\n❌ No article found matching "${CLI_SEARCH}"`);
        console.log('💡 Tip: use part of the title, e.g.  npx ts-node apply-watermark.ts "contract"');
        process.exit(1);
      }

      if (articles.length > 1) {
        console.log(`\n⚠️  ${articles.length} articles matched — processing all:\n`);
        articles.forEach((a, i) => console.log(`  ${i + 1}. ${a.title}`));
      }
    } else {
      // ── All articles mode ────────────────────────
      console.log("📋 No title given — processing ALL articles.");
      articles = await prisma.article.findMany();
    }

    console.log(`\nTotal to process: ${articles.length}\n`);

    for (let i = 0; i < articles.length; i++) {
      try {
        await processArticle(articles[i], s3Client, i + 1, articles.length);
      } catch (err: any) {
        console.error(`  ❌ Failed: ${err.message}`);
      }
    }

    console.log("\n🎉 Done — watermarks applied.");
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

applyWatermarks();