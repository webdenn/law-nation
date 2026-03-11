import "dotenv/config";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { prisma } from "../db/db.js";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/* ───────────────── CONFIG ───────────────── */

const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";

const s3Client = new S3Client({ region: AWS_REGION });

const WATERMARK_PATH = path.resolve(
  __dirname,
  "../../src/assests/img/logo-bg.png"
);

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

/* ───────────────── DOCX WATERMARK ───────────────── */

function injectWatermark(buffer: Buffer) {

  console.log("\n📦 Opening DOCX archive");

  const zip = new AdmZip(buffer);

  const entries = zip.getEntries();

  console.log("📂 DOCX structure:");

  entries.forEach(e => console.log("   ", e.entryName));

  /* IMAGE */

  if (!fs.existsSync(WATERMARK_PATH)) {
    console.log("❌ Watermark image NOT found");
    process.exit(1);
  }

  console.log("✅ Watermark image found:", WATERMARK_PATH);

  const imgBuffer = fs.readFileSync(WATERMARK_PATH);

  zip.addFile("word/media/logo-bg.png", imgBuffer);

  console.log("🖼 Image inserted → word/media/logo-bg.png");

  /* HEADER */

  let header = zip.getEntry("word/header1.xml");

  if (!header) {

    console.log("⚠ No header found");

    const headerXML = `
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
xmlns:v="urn:schemas-microsoft-com:vml"
xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">

${buildWatermarkXML()}

</w:hdr>
`;

    zip.addFile("word/header1.xml", Buffer.from(headerXML));

    console.log("✅ Created header1.xml with watermark");

  } else {

    console.log("📄 Header detected:", header.entryName);

    let xml = header.getData().toString();

    if (xml.includes("law-nation-watermark")) {

      console.log("⚠ Watermark already exists");

    } else {

      xml = xml.replace(
        "</w:hdr>",
        buildWatermarkXML() + "\n</w:hdr>"
      );

      zip.updateFile("word/header1.xml", Buffer.from(xml));

      console.log("✅ Watermark XML injected");

    }

  }

  /* RELATIONSHIP */

  const relsXML = `
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship
Id="rIdWatermark"
Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
Target="media/logo-bg.png"/>
</Relationships>
`;

  zip.addFile(
    "word/_rels/header1.xml.rels",
    Buffer.from(relsXML)
  );

  console.log("🔗 Relationship created");

  return zip.toBuffer();
}

/* ───────────────── MAIN SCRIPT ───────────────── */

async function main() {

  console.log("\n💧 LAW NATION WATERMARK SCRIPT");

  console.log("📍 Script location:", __dirname);

  console.log("🔍 Watermark path:", WATERMARK_PATH);

  if (!fs.existsSync(WATERMARK_PATH)) {
    console.log("❌ Watermark image not found");
    process.exit(1);
  }

  console.log("✅ Watermark image verified\n");

  const search = process.argv[2];

  if (!search) {
    console.log("❌ Please provide article name");
    process.exit(0);
  }

  console.log("🔎 Searching article:", search);

  const articles = await prisma.article.findMany({
    where: {
      title: {
        contains: search,
        mode: "insensitive",
      },
    },
  });

  if (!articles.length) {
    console.log("❌ No article found");
    process.exit(0);
  }

  console.log("✅ Articles found:", articles.length);

  for (let i = 0; i < articles.length; i++) {

    const article = articles[i];

    console.log(`\n📄 Processing ${i + 1}/${articles.length}`);
    console.log("Title:", article.title);

    try {

      const wordUrl =
        article.originalWordUrl || article.currentWordUrl;

      if (!wordUrl) {
        console.log("⚠ DOCX not found");
        continue;
      }

      console.log("🌐 DOCX URL:", wordUrl);

      console.log("⬇ Downloading DOCX...");

      const buffer = await downloadFileToBuffer(wordUrl);

      console.log("✅ Download complete");

      const newBuffer = injectWatermark(buffer);

      const key = new URL(wordUrl).pathname.slice(1);

      console.log("📤 Uploading watermarked file to S3");

      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: newBuffer,
          ContentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
      );

      console.log("🎉 Watermark uploaded successfully");

    } catch (err: any) {

      console.log("❌ ERROR:", err.message);

    }

  }

  console.log("\n✅ SCRIPT COMPLETE\n");

  process.exit(0);
}

main();