import "dotenv/config";
import { prisma } from "../db/db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import AdmZip from "adm-zip";

// ───────────────── CONFIG ─────────────────

const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";

const s3Client = new S3Client({ region: AWS_REGION });

const WATERMARK_TEXT = "LAW NATION";

// ───────────────── WATERMARK XML ─────────────────

function buildHeaderXML() {
  return `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:v="urn:schemas-microsoft-com:vml"
 xmlns:o="urn:schemas-microsoft-com:office:office">

<w:p>
<w:r>
<w:pict>

<v:shape id="law-nation-watermark"
 type="#_x0000_t136"
 style="position:absolute;
 width:450pt;
 height:450pt;
 mso-position-horizontal:center;
 mso-position-horizontal-relative:page;
 mso-position-vertical:center;
 mso-position-vertical-relative:page;
 rotation:315;
 opacity:0.1;
 z-index:-251654144">

<v:textpath
 style="font-family:Calibri;font-size:48pt"
 string="${WATERMARK_TEXT}"/>

</v:shape>

</w:pict>
</w:r>
</w:p>

</w:hdr>
`;
}

// ───────────────── DOCX WATERMARK ENGINE ─────────────────

function injectWatermark(buffer: Buffer) {

  const zip = new AdmZip(buffer);

  const entries = zip.getEntries();

  console.log("📦 DOCX Entries:");
  entries.forEach(e => console.log("   ", e.entryName));

  // Create header1.xml if missing
  if (!zip.getEntry("word/header1.xml")) {

    console.log("⚠ No header found → creating header1.xml");

    zip.addFile(
      "word/header1.xml",
      Buffer.from(buildHeaderXML(), "utf8")
    );
  }

  // Update relationships
  const relPath = "word/_rels/document.xml.rels";
  const relEntry = zip.getEntry(relPath);

  let relXML = relEntry.getData().toString("utf8");

  if (!relXML.includes("header1.xml")) {

    const newRel = `
<Relationship Id="rId999"
 Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header"
 Target="header1.xml"/>`;

    relXML = relXML.replace("</Relationships>", newRel + "\n</Relationships>");

    zip.updateFile(relPath, Buffer.from(relXML));

    console.log("✅ Relationship added → header1.xml");
  }

  // Attach header to document
  const docEntry = zip.getEntry("word/document.xml");

  let docXML = docEntry.getData().toString("utf8");

  if (!docXML.includes("headerReference")) {

    const headerRef = `<w:headerReference w:type="default" r:id="rId999"/>`;

    docXML = docXML.replace(
      "<w:sectPr>",
      `<w:sectPr>${headerRef}`
    );

    zip.updateFile("word/document.xml", Buffer.from(docXML));

    console.log("✅ Header attached to document section");
  }

  return zip.toBuffer();
}

// ───────────────── MAIN SCRIPT ─────────────────

async function run() {

  console.log("💧 [DOCX Watermark Injection Script]");

  const search = process.argv[2];

  let articles;

  if (search) {

    console.log("🔍 Searching:", search);

    articles = await prisma.article.findMany({
      where: {
        title: {
          contains: search,
          mode: "insensitive"
        }
      }
    });

  } else {

    articles = await prisma.article.findMany();

  }

  console.log("Total articles:", articles.length);

  for (let i = 0; i < articles.length; i++) {

    const article = articles[i];

    console.log(`\n[${i+1}/${articles.length}] ${article.title}`);

    try {

      const url =
        article.originalWordUrl ||
        article.currentWordUrl;

      if (!url) {
        console.log("⚠ No DOCX found");
        continue;
      }

      console.log("📥 Downloading:", url);

      const buffer = await downloadFileToBuffer(url);

      const newBuffer = injectWatermark(buffer);

      const key = new URL(url).pathname.slice(1);

      console.log("📤 Uploading to S3:", key);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: newBuffer,
          ContentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        })
      );

      console.log("✅ DOCX watermark uploaded");

    } catch (err:any) {

      console.log("❌ Error:", err.message);

    }
  }

  console.log("\n🎉 Script finished");

  process.exit(0);
}

run();