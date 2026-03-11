import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import AdmZip from "adm-zip";

// ─── CONFIG ──────────────────────────────────────────────────────────
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";
const isLocal = process.env.NODE_ENV === "local";

// ─── WATERMARK CONSTANTS ─────────────────────────────────────────────
const CENTER_SIZE = "350pt";
const BOTTOM_SIZE = "75pt";
const OPACITY_VAL = "0.15";

// ─── HELPER ──────────────────────────────────────────────────────────
function extractS3Key(url: string | null): string | null {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    return urlObj.pathname.startsWith("/")
      ? urlObj.pathname.slice(1)
      : urlObj.pathname;
  } catch {
    return null;
  }
}

// ─── DOCX CLEANER ────────────────────────────────────────────────────
function cleanDocxBuffer(buffer: Buffer): Buffer {
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    let changed = false;
    let counter = 0;

    for (const entry of entries) {
      if (!entry.entryName.startsWith("word/") || !entry.entryName.endsWith(".xml"))
        continue;

      let content = entry.getData().toString("utf-8");
      let modified = false;

      const vmlRegex =
        /(<(v:shape|v:rect|v:image|v:oval)[^>]*style=")([^"]*)(")([^>]*>)([\s\S]*?)(<\/\2>)/gi;

      if (content.includes("v:shape") || content.includes("word/media")) {
        content = content.replace(
          vmlRegex,
          (match, start, tag, style, quote, mid, inner, end) => {
            if (style.includes("fixed-wm")) return "";

            counter++;
            modified = true;

            // ─── CENTER WATERMARK ───
            const centerStyle = `
position:absolute;
width:${CENTER_SIZE};
height:${CENTER_SIZE};
mso-position-horizontal:center;
mso-position-horizontal-relative:page;
mso-position-vertical:center;
mso-position-vertical-relative:page;
z-index:-251658240;
opacity:${OPACITY_VAL};
filter:alpha(opacity=${parseFloat(OPACITY_VAL) * 100});
fixed-wm:yes;
`;

            const centerStart = start.replace(
              /id="[^"]*"/i,
              `id="wm_center_${counter}"`
            );

            const centerLogo =
              centerStart + centerStyle + quote + mid + inner + end;

            // ─── BOTTOM RIGHT LOGO ───
            const bottomStyle = `
position:absolute;
width:${BOTTOM_SIZE};
height:${BOTTOM_SIZE};
mso-position-horizontal:right;
mso-position-horizontal-relative:page;
mso-position-vertical:bottom;
mso-position-vertical-relative:page;
z-index:-251658240;
opacity:1;
fixed-wm:yes;
`;

            const bottomStart = start.replace(
              /id="[^"]*"/i,
              `id="wm_bottom_${counter}"`
            );

            const bottomLogo =
              bottomStart + bottomStyle + quote + mid + inner + end;

            return centerLogo + bottomLogo;
          }
        );
      }

      // ─── DRAWINGML FIX ─────────────────────────────
      if (content.includes("<wp:anchor")) {
        modified = true;

        content = content.replace(
          /<wp:positionH[^>]*>[\s\S]*?<\/wp:positionH>/gi,
          `<wp:positionH relativeFrom="page"><wp:align>center</wp:align></wp:positionH>`
        );

        content = content.replace(
          /<wp:positionV[^>]*>[\s\S]*?<\/wp:positionV>/gi,
          `<wp:positionV relativeFrom="page"><wp:align>center</wp:align></wp:positionV>`
        );

        if (!content.includes("<wp:wrapNone/>")) {
          content = content.replace(/<wp:wrapSquare[^>]*\/>/gi, "<wp:wrapNone/>");
        }
      }

      if (modified) {
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

// ─── MAIN FUNCTION ───────────────────────────────────────────────────
async function reWatermarkArticles() {
  console.log("🚀 Re-Watermark Script Started");

  const s3Client = isLocal ? null : new S3Client({ region: AWS_REGION });

  try {
    const articles = await prisma.article.findMany();

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];

      console.log(`[${i + 1}/${articles.length}] ${article.title}`);

      try {
        const wordUrl = article.originalWordUrl || article.currentWordUrl;

        if (!wordUrl) continue;

        const buffer = await downloadFileToBuffer(wordUrl);

        const fixedDocx = cleanDocxBuffer(buffer);

        const key = extractS3Key(article.currentWordUrl);

        if (s3Client && key) {
          await s3Client.send(
            new PutObjectCommand({
              Bucket: S3_BUCKET_ARTICLES,
              Key: key,
              Body: fixedDocx,
              ContentType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            })
          );
        }

        console.log("✅ DOCX Fixed");
      } catch (err: any) {
        console.log("❌ Article failed:", err.message);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

reWatermarkArticles();