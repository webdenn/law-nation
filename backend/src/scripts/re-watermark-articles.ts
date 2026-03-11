// import "dotenv/config";
// import { prisma } from "../db/db.js";
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
// import AdmZip from "adm-zip";

// // ─── CONFIG ──────────────────────────────────────────────────────────────────
// const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
// const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";
// const isLocal = process.env.NODE_ENV === "local";

// // ─── WATERMARK CONSTANTS ─────────────────────────────────────────────────────
// const WM_CENTER_SIZE = "350pt"; 
// const WM_BOTTOM_SIZE = "85pt";
// const WM_OPACITY = "0.10"; // Light for center (Same as preview)

// // ─── DOCX RE-ENGINEERING (Final Stage 1/2 Fix) ───────────────────────────────
// function cleanDocxBuffer(buffer: Buffer): Buffer {
//   try {
//     const zip = new AdmZip(buffer);
//     const zipEntries = zip.getEntries();
//     let changed = false;

//     for (const entry of zipEntries) {
//       // Document, Header aur Footer teeno jagah check karna zaroori hai
//       if (!entry.entryName.startsWith("word/") || !entry.entryName.endsWith(".xml")) continue;

//       let content = entry.getData().toString("utf-8");
//       let localModified = false;

//       // --- VML Logic: Unique Shape Generation ---
//       const vmlRegex = /(<(v:shape|v:rect|v:image|v:oval)[^>]*style=")([^"]*)(")([^>]*>)([\s\S]*?)(<\/\2>)/gi;
      
//       if (content.includes("v:shape") || content.includes("word/media/image")) {
//         let idCounter = Math.floor(Math.random() * 1000);
//         content = content.replace(vmlRegex, (match, start, tag, style, quote, mid, inner, end) => {
//           if (style.includes("processed-fixed")) return match;
          
//           localModified = true;
//           idCounter++;

//           // 1. CENTER WATERMARK (Behind text, very light)
//           let centerStart = start.replace(/id="[^"]*"/i, `id="wm_center_${idCounter}"`);
//           const centerStyle = `position:absolute;width:${WM_CENTER_SIZE};height:${WM_CENTER_SIZE};z-index:-251658240;mso-position-horizontal:center;mso-position-horizontal-relative:page;mso-position-vertical:center;mso-position-vertical-relative:page;opacity:${WM_OPACITY};filter:alpha(opacity=${parseFloat(WM_OPACITY)*100});processed-fixed:yes;`;
//           const centerPart = `${centerStart}${centerStyle}${quote}${mid}${inner}${end}`;

//           // 2. BOTTOM RIGHT LOGO (Floating on bottom margin)
//           let bottomStart = start.replace(/id="[^"]*"/i, `id="wm_bottom_${idCounter}"`);
//           // Bottom alignment relative to margin for better visibility in Word
//           const bottomStyle = `position:absolute;width:${WM_BOTTOM_SIZE};height:${WM_BOTTOM_SIZE};z-index:251659264;mso-position-horizontal:right;mso-position-horizontal-relative:margin;mso-position-vertical:bottom;mso-position-vertical-relative:margin;opacity:1;processed-fixed:yes;`;
//           const bottomPart = `${bottomStart}${bottomStyle}${quote}${mid}${inner}${end}`;

//           return centerPart + bottomPart;
//         });
//       }

//       // --- DrawingML (Modern DOCX) Anchor Fix ---
//       if (content.includes("<wp:anchor")) {
//         localModified = true;
//         // Force Center
//         content = content.replace(/<wp:positionH[^>]*>[\s\S]*?<\/wp:positionH>/gi, 
//           `<wp:positionH relativeFrom="page"><wp:align>center</wp:align></wp:positionH>`);
//         content = content.replace(/<wp:positionV[^>]*>[\s\S]*?<\/wp:positionV>/gi, 
//           `<wp:positionV relativeFrom="page"><wp:align>center</wp:align></wp:positionV>`);
        
//         // Force wrap-none (so it doesn't push text)
//         if (!content.includes("<wp:wrapNone/>")) {
//           content = content.replace(/<wp:wrapSquare[^>]*\/>|<wp:wrapTight[^>]*\/>/gi, "<wp:wrapNone/>");
//         }
//       }

//       if (localModified) {
//         zip.updateFile(entry.entryName, Buffer.from(content, "utf-8"));
//         changed = true;
//       }
//     }
//     return changed ? zip.toBuffer() : buffer;
//   } catch (err: any) {
//     console.error("⚠️ DOCX Engineer Error:", err.message);
//     return buffer;
//   }
// }

// // ─── MAIN EXECUTION ──────────────────────────────────────────────────────────
// async function reWatermarkArticles() {
//   console.log("🚀 [Re-Watermark v15] Fixing Preview & Bottom Logo Issue...");
//   const s3Client = isLocal ? null : new S3Client({ region: AWS_REGION });

//   try {
//     const articles = await prisma.article.findMany();
//     for (let i = 0; i < articles.length; i++) {
//       const article = articles[i];
//       console.log(`[${i+1}/${articles.length}] Processing: ${article.title}`);

//       try {
//         const wordUrl = article.originalWordUrl || article.currentWordUrl;
//         if (wordUrl) {
//           const wordBuffer = await downloadFileToBuffer(wordUrl);
//           const cleanWord = cleanDocxBuffer(wordBuffer);
          
//           const key = article.currentWordUrl ? new URL(article.currentWordUrl).pathname.slice(1) : null;
//           if (s3Client && key) {
//             await s3Client.send(new PutObjectCommand({
//               Bucket: S3_BUCKET_ARTICLES,
//               Key: key,
//               Body: cleanWord,
//               ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//             }));
//             console.log("   ✅ DOCX Updated on S3");
//           }
//         }
//       } catch (err: any) { console.error(`   ❌ Failed: ${err.message}`); }
//     }
//   } catch (e) { console.error(e); } finally { process.exit(0); }
// }

// reWatermarkArticles();


import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import AdmZip from "adm-zip";

// ─── CONFIG ─────────────────────────────────────────────────────────
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";
const isLocal = process.env.NODE_ENV === "local";

// ─── WATERMARK SETTINGS ─────────────────────────────────────────────
const WM_CENTER_SIZE = "350pt";
const WM_BOTTOM_SIZE = "85pt";
const WM_OPACITY = "0.10";

// ─── DOCX FIX ENGINE ───────────────────────────────────────────────
function cleanDocxBuffer(buffer: Buffer): Buffer {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    let changed = false;

    for (const entry of zipEntries) {

      if (!entry.entryName.startsWith("word/") || !entry.entryName.endsWith(".xml"))
        continue;

      let content = entry.getData().toString("utf-8");
      let localModified = false;

      const vmlRegex =
        /(<(v:shape|v:rect|v:image|v:oval)[^>]*style=")([^"]*)(")([^>]*>)([\s\S]*?)(<\/\2>)/gi;

      if (content.includes("v:shape") || content.includes("word/media")) {

        let shapeIndex = 0;

        content = content.replace(
          vmlRegex,
          (match, start, tag, style, quote, mid, inner, end) => {

            if (style.includes("processed-fixed")) return match;

            shapeIndex++;
            localModified = true;

            let newStart = start.replace(/id="[^"]*"/i, `id="wm_${shapeIndex}"`);

            // ─── CENTER WATERMARK ───
            if (shapeIndex === 1) {

              const centerStyle = `
position:absolute;
width:${WM_CENTER_SIZE};
height:${WM_CENTER_SIZE};
z-index:-251658240;
mso-position-horizontal:center;
mso-position-horizontal-relative:page;
mso-position-vertical:center;
mso-position-vertical-relative:page;
opacity:${WM_OPACITY};
filter:alpha(opacity=${parseFloat(WM_OPACITY) * 100});
processed-fixed:yes;
`;

              return `${newStart}${centerStyle}${quote}${mid}${inner}${end}`;
            }

            // ─── BOTTOM RIGHT LOGO ───
            if (shapeIndex === 2) {

              const bottomStyle = `
position:absolute;
width:${WM_BOTTOM_SIZE};
height:${WM_BOTTOM_SIZE};
z-index:251659264;
mso-position-horizontal:right;
mso-position-horizontal-relative:page;
mso-position-vertical:bottom;
mso-position-vertical-relative:page;
opacity:1;
processed-fixed:yes;
`;

              return `${newStart}${bottomStyle}${quote}${mid}${inner}${end}`;
            }

            return match;
          }
        );
      }

      // ─── DrawingML FIX (important) ──────────────────────────────
      if (content.includes("<wp:anchor")) {

        localModified = true;

        // remove forced center alignment
        content = content.replace(
          /<wp:positionH[^>]*>[\s\S]*?<\/wp:positionH>/gi,
          ""
        );

        content = content.replace(
          /<wp:positionV[^>]*>[\s\S]*?<\/wp:positionV>/gi,
          ""
        );

        if (!content.includes("<wp:wrapNone/>")) {
          content = content.replace(
            /<wp:wrapSquare[^>]*\/>|<wp:wrapTight[^>]*\/>/gi,
            "<wp:wrapNone/>"
          );
        }
      }

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

// ─── MAIN SCRIPT ───────────────────────────────────────────────────
async function reWatermarkArticles() {

  console.log("🚀 Re-Watermark Script Running...");

  const s3Client = isLocal ? null : new S3Client({ region: AWS_REGION });

  try {

    const articles = await prisma.article.findMany();

    for (let i = 0; i < articles.length; i++) {

      const article = articles[i];

      console.log(`[${i + 1}/${articles.length}] ${article.title}`);

      try {

        const wordUrl = article.originalWordUrl || article.currentWordUrl;

        if (!wordUrl) continue;

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

          console.log("   ✅ DOCX Updated on S3");
        }

      } catch (err: any) {
        console.error(`   ❌ Failed: ${err.message}`);
      }
    }

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

reWatermarkArticles();