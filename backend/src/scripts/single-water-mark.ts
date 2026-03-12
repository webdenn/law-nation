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

// DrawingML dimensions in EMU (1pt = 12700 EMU)
const WIDTH_EMU  = 4445000;  // 350pt
const HEIGHT_EMU = 2159000;  // 170pt

// Opacity for <a:alphaModFix>: 0–100000 (100000 = fully opaque)
// 15000 = 15 % → clearly visible but dim
const OPACITY_AMT = "15000";

const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";

const s3 = new S3Client({ region: AWS_REGION });

/* ───────────────── WATERMARK XML ───────────────── */

/**
 * DrawingML watermark — renders correctly in both Microsoft Word AND Google Docs.
 * VML (<w:pict>/<v:shape>) is a legacy MS-only format that Google Docs ignores entirely.
 * <wp:anchor behindDoc="1"> places the image behind text; <a:alphaModFix> dims it.
 */
function watermarkXML() {
  return `<w:p>
  <w:pPr><w:jc w:val="center"/></w:pPr>
  <w:r>
    <w:drawing>
      <wp:anchor
          distT="0" distB="0" distL="0" distR="0"
          simplePos="0"
          relativeHeight="251658240"
          behindDoc="1"
          locked="0"
          layoutInCell="1"
          allowOverlap="1">
        <wp:simplePos x="0" y="0"/>
        <wp:positionH relativeFrom="page"><wp:align>center</wp:align></wp:positionH>
        <wp:positionV relativeFrom="page"><wp:align>center</wp:align></wp:positionV>
        <wp:extent cx="${WIDTH_EMU}" cy="${HEIGHT_EMU}"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:wrapNone/>
        <wp:docPr id="1" name="law-nation-watermark"/>
        <wp:cNvGraphicFramePr/>
        <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:nvPicPr>
                <pic:cNvPr id="0" name="law-nation-watermark"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="rIdWatermark">
                  <a:alphaModFix amt="${OPACITY_AMT}"/>
                </a:blip>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm><a:off x="0" y="0"/><a:ext cx="${WIDTH_EMU}" cy="${HEIGHT_EMU}"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:anchor>
    </w:drawing>
  </w:r>
</w:p>`;
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
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
       xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       mc:Ignorable="w14">

${watermarkXML()}

</w:hdr>`;

    zip.addFile("word/header1.xml", Buffer.from(header));

  } else {

    console.log("📄 Header detected");

    let xml = headerEntry.getData().toString();

    // Ensure wp namespace is declared (needed for DrawingML anchor)
    if (!xml.includes('xmlns:wp=')) {
      xml = xml.replace(/<w:hdr /, '<w:hdr xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ');
    }

    if (!xml.includes("law-nation-watermark")) {

      xml = xml.replace("</w:hdr>", watermarkXML() + "\n</w:hdr>");

      zip.updateFile("word/header1.xml", Buffer.from(xml));

      console.log("✅ Watermark injected");

    } else {

      console.log("⚠ Watermark already exists — replacing with DrawingML version");

      // Replace the entire <w:p> containing the old watermark (handles both VML and DrawingML)
      xml = xml.replace(/<w:p>[\s\S]*?law-nation-watermark[\s\S]*?<\/w:p>/, watermarkXML());

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