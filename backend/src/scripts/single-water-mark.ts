import "dotenv/config";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { fileURLToPath } from "url";

import { prisma } from "../db/db.js";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/* ───────────────── DIRNAME ───────────────── */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ───────────────── CONFIG ───────────────── */

const WATERMARK_PATH = path.resolve(
  __dirname,
  "../../src/assests/img/logo-bg.png"
);

const WIDTH_EMU = 4445000;
const HEIGHT_EMU = 2159000;
const OPACITY_AMT = "15000";

const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const S3_BUCKET = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";

const s3 = new S3Client({ region: AWS_REGION });

/* ───────────────── WATERMARK XML ───────────────── */

// NOTE: No namespace declarations here — they live on the root <w:hdr> element
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

        <wp:positionH relativeFrom="page">
          <wp:align>center</wp:align>
        </wp:positionH>

        <wp:positionV relativeFrom="page">
          <wp:align>center</wp:align>
        </wp:positionV>

        <wp:extent cx="${WIDTH_EMU}" cy="${HEIGHT_EMU}"/>

        <wp:wrapNone/>

        <wp:docPr id="999" name="law-nation-watermark"/>

        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic>
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
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="${WIDTH_EMU}" cy="${HEIGHT_EMU}"/>
                </a:xfrm>
                <a:prstGeom prst="rect">
                  <a:avLst/>
                </a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>

      </wp:anchor>
    </w:drawing>
  </w:r>
</w:p>`;
}

/* ───────────────── FULL HEADER XML (with all namespaces) ───────────────── */

function buildFreshHeader() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr
  xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">

  ${watermarkXML()}

</w:hdr>`;
}

/* ───────────────── PATCH EXISTING HEADER (add missing namespaces) ───────────────── */

function patchHeaderNamespaces(xml) {
  const namespacesToAdd = {
    'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'xmlns:wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'xmlns:a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'xmlns:pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture',
  };

  let patched = xml;
  for (const [prefix, uri] of Object.entries(namespacesToAdd)) {
    if (!patched.includes(prefix)) {
      // Inject namespace into the opening <w:hdr ...> tag
      patched = patched.replace(/(<w:hdr\b)/, `$1 ${prefix}="${uri}"`);
    }
  }
  return patched;
}

/* ───────────────── HEADER RELATIONSHIPS XML ───────────────── */

function buildHeaderRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship
    Id="rIdWatermark"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
    Target="media/logo-bg.png"/>
</Relationships>`;
}

/* ───────────────── APPLY WATERMARK ───────────────── */

function applyWatermark(buffer) {
  const zip = new AdmZip(buffer);

  /* 1. INSERT WATERMARK IMAGE */
  const img = fs.readFileSync(WATERMARK_PATH);
  zip.addFile("word/media/logo-bg.png", img);

  /* 2. CREATE OR PATCH HEADER */
  const headerEntry = zip.getEntry("word/header1.xml");

  if (!headerEntry) {
    // No header exists — create a fresh one with all namespaces
    zip.addFile("word/header1.xml", Buffer.from(buildFreshHeader()));
  } else {
    // Header exists — patch namespaces then inject watermark if not already present
    let xml = headerEntry.getData().toString("utf8");

    if (!xml.includes("law-nation-watermark")) {
      xml = patchHeaderNamespaces(xml);
      xml = xml.replace("</w:hdr>", watermarkXML() + "\n</w:hdr>");
      zip.updateFile("word/header1.xml", Buffer.from(xml, "utf8"));
    }
  }

  /* 3. CREATE OR PATCH HEADER RELATIONSHIPS */
  const relPath = "word/_rels/header1.xml.rels";
  const relEntry = zip.getEntry(relPath);

  if (!relEntry) {
    zip.addFile(relPath, Buffer.from(buildHeaderRels()));
  } else {
    let xml = relEntry.getData().toString("utf8");
    if (!xml.includes("logo-bg.png")) {
      xml = xml.replace(
        "</Relationships>",
        `  <Relationship
    Id="rIdWatermark"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
    Target="media/logo-bg.png"/>
</Relationships>`
      );
      zip.updateFile(relPath, Buffer.from(xml, "utf8"));
    }
  }

  /* 4. LINK HEADER TO DOCUMENT via sectPr */
  const documentEntry = zip.getEntry("word/document.xml");
  if (!documentEntry) throw new Error("word/document.xml not found in docx");

  let doc = documentEntry.getData().toString("utf8");

  // Only add our headerReference if it isn't already there
  if (!doc.includes('r:id="rIdHeader1"')) {
    if (doc.includes("</w:sectPr>")) {
      doc = doc.replace(
        "</w:sectPr>",
        `  <w:headerReference w:type="default" r:id="rIdHeader1"/>
</w:sectPr>`
      );
    } else {
      // No sectPr — append one before </w:body>
      doc = doc.replace(
        "</w:body>",
        `<w:sectPr>
  <w:headerReference w:type="default" r:id="rIdHeader1"/>
</w:sectPr>
</w:body>`
      );
    }
    zip.updateFile("word/document.xml", Buffer.from(doc, "utf8"));
  }

  /* 5. ADD HEADER RELATIONSHIP TO document.xml.rels */
  const docRelPath = "word/_rels/document.xml.rels";
  const docRelEntry = zip.getEntry(docRelPath);
  if (!docRelEntry) throw new Error("word/_rels/document.xml.rels not found in docx");

  let relXML = docRelEntry.getData().toString("utf8");

  if (!relXML.includes("header1.xml")) {
    relXML = relXML.replace(
      "</Relationships>",
      `  <Relationship
    Id="rIdHeader1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header"
    Target="header1.xml"/>
</Relationships>`
    );
    zip.updateFile(docRelPath, Buffer.from(relXML, "utf8"));
  }

  /* 6. FIX CONTENT TYPES */
  const ctEntry = zip.getEntry("[Content_Types].xml");
  if (!ctEntry) throw new Error("[Content_Types].xml not found in docx");

  let ctXML = ctEntry.getData().toString("utf8");

  if (!ctXML.includes("header1.xml")) {
    ctXML = ctXML.replace(
      "</Types>",
      `  <Override PartName="/word/header1.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
</Types>`
    );
    zip.updateFile("[Content_Types].xml", Buffer.from(ctXML, "utf8"));
  }

  // Also ensure the PNG content type is registered
  if (!ctXML.includes("image/png")) {
    ctXML = ctXML.replace(
      "</Types>",
      `  <Default Extension="png" ContentType="image/png"/>
</Types>`
    );
    zip.updateFile("[Content_Types].xml", Buffer.from(ctXML, "utf8"));
  }

  return zip.toBuffer();
}

/* ───────────────── MAIN ───────────────── */

async function main() {
  console.log("\n💧 WATERMARK SCRIPT\n");

  const search = process.argv[2];
  if (!search) {
    console.error("Usage: node watermark.js <search-term>");
    process.exit(1);
  }

  const articles = await prisma.article.findMany({
    where: {
      title: { contains: search, mode: "insensitive" },
    },
  });

  console.log(`Found ${articles.length} article(s) matching "${search}"\n`);

  for (const article of articles) {
    try {
      const url = article.originalWordUrl || article.currentWordUrl;
      if (!url) {
        console.log(`SKIP (no URL): ${article.title}`);
        continue;
      }

      console.log(`Processing: ${article.title}`);

      const buffer = await downloadFileToBuffer(url);
      const modified = applyWatermark(buffer);

      const key = new URL(url).pathname.slice(1);

      await s3.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: modified,
          ContentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
      );

      console.log(`✅ Watermark applied: ${article.title}`);
    } catch (err) {
      console.error(`❌ ERROR (${article.title}): ${err.message}`);
    }
  }

  console.log("\nDone\n");
}

main();