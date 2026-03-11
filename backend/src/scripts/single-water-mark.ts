import "dotenv/config";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { fileURLToPath } from "url";

import { prisma } from "../db/db.js";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/* ───────────────── PATH FIX FOR ESM ───────────────── */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ───────────────── CONFIG ───────────────── */

const WATERMARK_PATH = path.resolve(
  __dirname,
  "../../src/assests/img/logo-bg.png"
);

const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";

const s3 = new S3Client({ region: AWS_REGION });

/* ───────────────── WATERMARK XML ───────────────── */

function buildWatermarkXML() {
  return `
<w:p>
<w:r>
<w:pict>
<v:shape id="law-nation-watermark"
 type="#_x0000_t75"
 style="
 position:absolute;
 width:420pt;
 height:420pt;
 mso-position-horizontal:center;
 mso-position-horizontal-relative:page;
 mso-position-vertical:center;
 mso-position-vertical-relative:page;
 rotation:315;
 opacity:0.15;
 z-index:-251658752">

<v:imagedata r:id="rIdWatermark"/>

</v:shape>
</w:pict>
</w:r>
</w:p>
`;
}

/* ───────────────── DOCX WATERMARK FUNCTION ───────────────── */

function applyWatermark(buffer) {

  console.log("\n📦 Opening DOCX...");

  const zip = new AdmZip(buffer);

  const entries = zip.getEntries();

  console.log("\n📂 DOCX FILE STRUCTURE:");
  entries.forEach(e => console.log("   ", e.entryName));

  if (!fs.existsSync(WATERMARK_PATH)) {
    console.log("❌ Watermark image not found:", WATERMARK_PATH);
    process.exit(1);
  }

  console.log("\n🖼 Watermark image located:", WATERMARK_PATH);

  const img = fs.readFileSync(WATERMARK_PATH);

  zip.addFile("word/media/logo-bg.png", img);

  console.log("✅ Image inserted → word/media/logo-bg.png");

  /* FIND ALL HEADERS */

  const headers = entries.filter(e =>
    e.entryName.startsWith("word/header")
  );

  if (!headers.length) {

    console.log("⚠ No header files detected");

    const headerXML = `
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:v="urn:schemas-microsoft-com:vml"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">

${buildWatermarkXML()}

</w:hdr>
`;

    zip.addFile("word/header1.xml", Buffer.from(headerXML));

    console.log("✅ Created header1.xml");

  } else {

    console.log("\n📄 Headers detected:", headers.length);

    headers.forEach(header => {

      console.log("➡ Processing:", header.entryName);

      let xml = header.getData().toString();

      if (xml.includes("law-nation-watermark")) {

        console.log("⚠ Watermark already exists in", header.entryName);

      } else {

        xml = xml.replace(
          "</w:hdr>",
          buildWatermarkXML() + "\n</w:hdr>"
        );

        zip.updateFile(header.entryName, Buffer.from(xml));

        console.log("✅ Watermark injected into", header.entryName);

      }

    });

  }

  /* RELATIONSHIP */

  const relXML = `
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship
 Id="rIdWatermark"
 Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
 Target="media/logo-bg.png"/>
</Relationships>
`;

  zip.addFile(
    "word/_rels/header1.xml.rels",
    Buffer.from(relXML)
  );

  console.log("\n🔗 Relationship created");

  return zip.toBuffer();
}

/* ───────────────── MAIN SCRIPT ───────────────── */

async function main() {

  console.log("\n💧 LAW NATION DOCX WATERMARK SCRIPT\n");

  console.log("📍 Script path:", __dirname);
  console.log("🖼 Watermark path:", WATERMARK_PATH);

  if (!fs.existsSync(WATERMARK_PATH)) {

    console.log("❌ Watermark image missing");

    process.exit(1);

  }

  console.log("✅ Watermark image verified");

  const search = process.argv[2];

  if (!search) {

    console.log("❌ Please provide article title");

    process.exit(0);

  }

  console.log("\n🔍 Searching article:", search);

  const articles = await prisma.article.findMany({
    where: {
      title: {
        contains: search,
        mode: "insensitive"
      }
    }
  });

  console.log("📚 Articles found:", articles.length);

  if (!articles.length) process.exit(0);

  for (let i = 0; i < articles.length; i++) {

    const article = articles[i];

    console.log(`\n📄 Processing ${i + 1}/${articles.length}`);

    console.log("Title:", article.title);

    try {

      const wordUrl =
        article.originalWordUrl || article.currentWordUrl;

      if (!wordUrl) {

        console.log("⚠ DOCX URL missing");

        continue;

      }

      console.log("🌐 DOCX URL:", wordUrl);

      console.log("⬇ Downloading DOCX...");

      const buffer = await downloadFileToBuffer(wordUrl);

      console.log("✅ Download complete");

      const modified = applyWatermark(buffer);

      const key = new URL(wordUrl).pathname.slice(1);

      console.log("\n📤 Uploading modified DOCX to S3");

      await s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: modified,
          ContentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        })
      );

      console.log("🎉 Upload success");

    } catch (err) {

      console.log("❌ ERROR:", err.message);

    }

  }

  console.log("\n✅ Script finished\n");

  process.exit(0);
}

main();