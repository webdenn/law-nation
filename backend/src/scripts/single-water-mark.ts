import "dotenv/config";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { fileURLToPath } from "url";

import { prisma } from "../db/db.js";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/* ───────────────── ESM dirname fix ───────────────── */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ───────────────── CONFIG ───────────────── */

const WATERMARK_PATH = path.resolve(
  __dirname,
  "../../src/assests/img/logo-bg.png"
);

const WIDTH = "350pt";
const HEIGHT = "170pt";
const OPACITY = "0.18";

const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";

const s3 = new S3Client({ region: AWS_REGION });

/* ───────────────── WATERMARK XML ───────────────── */

function watermarkXML() {
  return `
<w:p>
  <w:pPr>
    <w:jc w:val="center"/>
  </w:pPr>
  <w:r>
    <w:pict>
      <v:shape id="law-nation-watermark"
        type="#_x0000_t75"
        style="position:absolute;
               width:${WIDTH};
               height:${HEIGHT};
               mso-position-horizontal:center;
               mso-position-horizontal-relative:page;
               mso-position-vertical:center;
               mso-position-vertical-relative:page;
               opacity:${OPACITY};
               z-index:-251658752"
        filled="t"
        stroked="f">

        <v:imagedata
          r:id="rIdWatermark"
          o:title="watermark"
          gain="1"
          blacklevel="0.85"/>

      </v:shape>
    </w:pict>
  </w:r>
</w:p>
`;
}

/* ───────────────── APPLY WATERMARK ───────────────── */

function applyWatermark(buffer) {

  const zip = new AdmZip(buffer);

  const entries = zip.getEntries();

  console.log("\n📂 DOCX FILE STRUCTURE:");
  entries.forEach(e => console.log("   ", e.entryName));

  /* INSERT IMAGE */

  const img = fs.readFileSync(WATERMARK_PATH);

  zip.addFile("word/media/logo-bg.png", img);

  console.log("✅ Watermark image inserted");

  /* HEADER */

  let headerEntry = zip.getEntry("word/header1.xml");

  if (!headerEntry) {

    console.log("⚠ No header found → creating header1.xml");

    const header = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
       xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
       xmlns:o="urn:schemas-microsoft-com:office:office"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:v="urn:schemas-microsoft-com:vml"
       xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       mc:Ignorable="w14">

${watermarkXML()}

</w:hdr>`;

    zip.addFile("word/header1.xml", Buffer.from(header));

  } else {

    console.log("📄 Header detected");

    let xml = headerEntry.getData().toString();

    if (!xml.includes("law-nation-watermark")) {

      xml = xml.replace("</w:hdr>", watermarkXML() + "\n</w:hdr>");

      zip.updateFile("word/header1.xml", Buffer.from(xml));

      console.log("✅ Watermark injected");

    } else {

      console.log("⚠ Watermark already exists — updating");

      xml = xml.replace(
        /<v:shape id="law-nation-watermark"[\s\S]*?<\/v:shape>/,
        `<v:shape id="law-nation-watermark"
        type="#_x0000_t75"
        style="position:absolute;
               width:${WIDTH};
               height:${HEIGHT};
               mso-position-horizontal:center;
               mso-position-horizontal-relative:page;
               mso-position-vertical:center;
               mso-position-vertical-relative:page;
               opacity:${OPACITY};
               z-index:-251658752"
        filled="t"
        stroked="f">
        <v:imagedata
          r:id="rIdWatermark"
          o:title="watermark"
          gain="0.5"
          blacklevel="0.98"/>
      </v:shape>`
      );

      zip.updateFile("word/header1.xml", Buffer.from(xml));

      console.log("✅ Watermark updated");

    }

  }

  /* HEADER IMAGE RELATIONSHIP */

  const headerRel = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship
    Id="rIdWatermark"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
    Target="media/logo-bg.png"/>
</Relationships>`;

  zip.addFile("word/_rels/header1.xml.rels", Buffer.from(headerRel));

  console.log("🔗 Header relationship added");

  /* LINK HEADER TO DOCUMENT */

  const documentXML = zip.getEntry("word/document.xml");

  let doc = documentXML.getData().toString();

  if (!doc.includes("headerReference")) {

    console.log("⚠ Header not linked → fixing document.xml");

    doc = doc.replace(
      "</w:sectPr>",
      `<w:headerReference w:type="default" r:id="rIdHeader1"/>
</w:sectPr>`
    );

    zip.updateFile("word/document.xml", Buffer.from(doc));

  }

  /* DOCUMENT RELATIONSHIP */

  const relEntry = zip.getEntry("word/_rels/document.xml.rels");

  let relXML = relEntry.getData().toString();

  if (!relXML.includes("header1.xml")) {

    console.log("🔗 Adding header relationship");

    relXML = relXML.replace(
      "</Relationships>",
      `  <Relationship
    Id="rIdHeader1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header"
    Target="header1.xml"/>
</Relationships>`
    );

    zip.updateFile("word/_rels/document.xml.rels", Buffer.from(relXML));

  }

  return zip.toBuffer();
}

/* ───────────────── MAIN SCRIPT ───────────────── */

async function main() {

  console.log("\n💧 WATERMARK SCRIPT\n");

  console.log("🖼 Watermark:", WATERMARK_PATH);

  const search = process.argv[2];

  const articles = await prisma.article.findMany({
    where: {
      title: { contains: search, mode: "insensitive" }
    }
  });

  console.log("📚 Articles found:", articles.length);

  for (const article of articles) {

    try {

      const url =
        article.originalWordUrl || article.currentWordUrl;

      console.log("\n📄 Article:", article.title);
      console.log("⬇ Downloading DOCX");

      const buffer = await downloadFileToBuffer(url);

      const modified = applyWatermark(buffer);

      const key = new URL(url).pathname.slice(1);

      console.log("📤 Uploading to S3");

      await s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: modified,
          ContentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        })
      );

      console.log("🎉 Watermark applied");

    } catch (err) {

      console.log("❌ ERROR:", err.message);

    }

  }

  console.log("\n✅ Script finished\n");

}

main();