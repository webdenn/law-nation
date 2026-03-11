import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import AdmZip from "adm-zip";

// ─── CONFIG ───────────────────────────────────────
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET_ARTICLES =
  process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";

const s3Client = new S3Client({
  region: AWS_REGION,
});

// ─── WATERMARK CONFIG ─────────────────────────────
const WM_WIDTH = "400pt";
const WM_HEIGHT = "400pt";
const WM_OPACITY = "0.10";

// ─── WATERMARK TEMPLATE ───────────────────────────
function buildWatermarkXML() {
  return `
<w:p>
<w:r>
<w:pict>
<v:shape id="law-nation-watermark"
 type="#_x0000_t75"
 style="position:absolute;
 width:${WM_WIDTH};
 height:${WM_HEIGHT};
 mso-position-horizontal:center;
 mso-position-horizontal-relative:page;
 mso-position-vertical:center;
 mso-position-vertical-relative:page;
 opacity:${WM_OPACITY};
 z-index:251658240">

</v:shape>
</w:pict>
</w:r>
</w:p>
`;
}

// ─── DOCX WATERMARK INJECTION ─────────────────────
function injectCenterWatermark(buffer: Buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  let modifiedXML = "";

  console.log("📦 DOCX Entries:");
  entries.forEach((e) => console.log("   ", e.entryName));

  for (const entry of entries) {
    if (!entry.entryName.startsWith("word/header")) continue;

    console.log("📄 Header found:", entry.entryName);

    let xml = entry.getData().toString("utf-8");

    const watermarkXML = buildWatermarkXML();

    if (xml.includes("law-nation-watermark")) {
      console.log("⚠ Watermark already exists");
      return {
        buffer,
        modifiedFile: null,
      };
    }

    xml = xml.replace("</w:hdr>", watermarkXML + "\n</w:hdr>");

    zip.updateFile(entry.entryName, Buffer.from(xml, "utf-8"));

    modifiedXML = entry.entryName;

    console.log("✅ Watermark injected into:", entry.entryName);

    break;
  }

  if (!modifiedXML) {
    console.log("⚠ No header found, injecting into document.xml");

    const entry = zip.getEntry("word/document.xml");

    if (!entry) {
      console.log("❌ document.xml not found");
      return {
        buffer,
        modifiedFile: null,
      };
    }

    let xml = entry.getData().toString("utf-8");

    const watermarkXML = buildWatermarkXML();

    xml = xml.replace("</w:body>", watermarkXML + "\n</w:body>");

    zip.updateFile("word/document.xml", Buffer.from(xml, "utf-8"));

    modifiedXML = "word/document.xml";

    console.log("✅ Watermark injected into document.xml");
  }

  return {
    buffer: zip.toBuffer(),
    modifiedFile: modifiedXML,
  };
}

// ─── MAIN SCRIPT ──────────────────────────────────
async function applyWatermark() {
  console.log("💧 [Apply Center Watermark Script]");

  const search = process.argv[2];

  let articles;

  if (search) {
    console.log(`🔍 Searching article: "${search}"`);

    articles = await prisma.article.findMany({
      where: {
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
    });

    if (articles.length === 0) {
      console.log("❌ No article found");
      process.exit(0);
    }
  } else {
    console.log("📚 Processing ALL articles");
    articles = await prisma.article.findMany();
  }

  console.log("Total articles:", articles.length);

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];

    console.log(
      `\n[${i + 1}/${articles.length}] ${article.title}`
    );

    try {
      const wordUrl =
        article.originalWordUrl || article.currentWordUrl;

      if (!wordUrl) {
        console.log("⚠ No DOCX found");
        continue;
      }

      console.log("📥 Downloading DOCX:", wordUrl);

      const wordBuffer = await downloadFileToBuffer(wordUrl);

      const { buffer: newBuffer, modifiedFile } =
        injectCenterWatermark(wordBuffer);

      if (!modifiedFile) {
        console.log("⚠ Nothing modified");
        continue;
      }

      const key = new URL(wordUrl).pathname.slice(1);

      console.log("🛠 Modified XML:", modifiedFile);
      console.log("📤 Uploading to S3 key:", key);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET_ARTICLES,
          Key: key,
          Body: newBuffer,
          ContentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
      );

      console.log("✅ DOCX watermark uploaded");
    } catch (err: any) {
      console.log("❌ Error:", err.message);
    }
  }

  console.log("\n🎉 Script finished");
  process.exit(0);
}

applyWatermark();