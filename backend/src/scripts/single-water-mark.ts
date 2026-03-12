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

/* ───────────────── HELPERS ───────────────── */

/** Extract the Target attribute from a Relationship element by Id. */
function findRelTarget(relXML: string, id: string): string | null {
  const rx = /<Relationship\b([^>]+)\/>/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(relXML)) !== null) {
    const attrs = m[1];
    if (attrs.includes(`Id="${id}"`)) {
      const t = attrs.match(/Target="([^"]+)"/);
      return t ? t[1] : null;
    }
  }
  return null;
}

/** Inject watermark into a header XML string if not already present. */
function injectWatermarkIntoHeader(xml: string): string {
  if (xml.includes("law-nation-watermark")) return xml;
  xml = patchHeaderNamespaces(xml);
  return xml.replace("</w:hdr>", `${watermarkXML()}\n</w:hdr>`);
}

/* ───────────────── APPLY WATERMARK ───────────────── */

function applyWatermark(buffer: Buffer): Buffer {
  const zip = new AdmZip(buffer);
  const img = fs.readFileSync(WATERMARK_PATH);

  /* ── 1. INSERT / UPDATE WATERMARK IMAGE ────────────────────────────
   *  addFile on a duplicate path creates two central-directory entries
   *  for the same part — illegal in OOXML, causes Word to refuse the file. */
  const imgEntry = zip.getEntry("word/media/logo-bg.png");
  if (imgEntry) {
    zip.updateFile("word/media/logo-bg.png", img);
  } else {
    zip.addFile("word/media/logo-bg.png", img);
  }

  /* ── 2. READ EXISTING document.xml + its relationships ─────────────── */
  const documentEntry = zip.getEntry("word/document.xml");
  if (!documentEntry) throw new Error("word/document.xml not found");
  let doc = documentEntry.getData().toString("utf8");

  const docRelEntry = zip.getEntry("word/_rels/document.xml.rels");
  if (!docRelEntry) throw new Error("word/_rels/document.xml.rels not found");
  let docRelXML = docRelEntry.getData().toString("utf8");

  /* ── 3. FIND THE EXISTING DEFAULT HEADER REFERENCE (if any) ─────────
   *  CRITICAL: if a default headerReference already exists we must NOT
   *  add another one — two defaults in the same sectPr makes Word crash. */
  let existingRefId: string | null = null;
  {
    const rx = /<w:headerReference\b([^>]+)\/>/g;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(doc)) !== null) {
      const attrs = m[1];
      if (/w:type="default"/.test(attrs)) {
        const idM = attrs.match(/r:id="([^"]+)"/);
        if (idM) { existingRefId = idM[1]; break; }
      }
    }
  }

  /* ── 4. RESOLVE TARGET HEADER FILE ──────────────────────────────────
   *  Follow the existing relationship → get the actual header filename.
   *  Fall back to header1.xml only when there is truly no existing header. */
  let targetHeaderFile = "word/header1.xml";
  let addNewRef = !existingRefId;
  const newRefId = "rIdWatermarkHdr";

  if (existingRefId) {
    const target = findRelTarget(docRelXML, existingRefId);
    if (target) {
      // Target is relative to word/ folder, e.g. "header1.xml" or "header2.xml"
      targetHeaderFile = "word/" + target.replace(/^.*\//, "");
    }
  }

  /* ── 5. INJECT WATERMARK INTO THE CORRECT HEADER FILE ──────────────── */
  const headerEntry = zip.getEntry(targetHeaderFile);
  if (!headerEntry) {
    // File referenced in rels but missing — create it fresh
    zip.addFile(targetHeaderFile, Buffer.from(buildFreshHeader(), "utf8"));
  } else {
    const patched = injectWatermarkIntoHeader(headerEntry.getData().toString("utf8"));
    zip.updateFile(targetHeaderFile, Buffer.from(patched, "utf8"));
  }

  /* ── 6. ADD WATERMARK IMAGE RELATIONSHIP TO THAT HEADER'S .rels ─────── */
  const headerRelFile = targetHeaderFile.replace("word/", "word/_rels/") + ".rels";
  const hRelEntry = zip.getEntry(headerRelFile);
  if (!hRelEntry) {
    zip.addFile(headerRelFile, Buffer.from(buildHeaderRels(), "utf8"));
  } else {
    let xml = hRelEntry.getData().toString("utf8");
    if (!xml.includes("logo-bg.png")) {
      xml = xml.replace(
        "</Relationships>",
        `  <Relationship Id="rIdWatermark"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
    Target="media/logo-bg.png"/>
</Relationships>`
      );
      zip.updateFile(headerRelFile, Buffer.from(xml, "utf8"));
    }
  }

  /* ── 7. LINK HEADER TO DOCUMENT (only when no default header existed) ─
   *  Insert before the LAST </w:sectPr> — that is the body-level section.
   *  Inserting before the first </w:sectPr> would target a section-break
   *  paragraph instead, showing the watermark on only one section. */
  if (addNewRef) {
    const lastClose = doc.lastIndexOf("</w:sectPr>");
    if (lastClose !== -1) {
      doc =
        doc.slice(0, lastClose) +
        `  <w:headerReference w:type="default" r:id="${newRefId}"/>\n` +
        doc.slice(lastClose);
    } else {
      doc = doc.replace(
        "</w:body>",
        `<w:sectPr>\n  <w:headerReference w:type="default" r:id="${newRefId}"/>\n</w:sectPr>\n</w:body>`
      );
    }
    zip.updateFile("word/document.xml", Buffer.from(doc, "utf8"));

    // Add the matching Relationship entry
    const headerFileName = targetHeaderFile.replace("word/", "");
    if (!docRelXML.includes(`"${headerFileName}"`)) {
      docRelXML = docRelXML.replace(
        "</Relationships>",
        `  <Relationship Id="${newRefId}"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header"
    Target="${headerFileName}"/>
</Relationships>`
      );
      zip.updateFile("word/_rels/document.xml.rels", Buffer.from(docRelXML, "utf8"));
    }
  }

  /* ── 8. FIX CONTENT TYPES — one read, all changes, one write ─────────── */
  const ctEntry = zip.getEntry("[Content_Types].xml");
  if (!ctEntry) throw new Error("[Content_Types].xml not found");
  let ctXML = ctEntry.getData().toString("utf8");
  let ctChanged = false;

  if (!ctXML.includes('Extension="png"') && !ctXML.includes("image/png")) {
    ctXML = ctXML.replace(
      "</Types>",
      `  <Default Extension="png" ContentType="image/png"/>\n</Types>`
    );
    ctChanged = true;
  }

  const hBaseName = targetHeaderFile.replace("word/", "");
  if (!ctXML.includes(hBaseName)) {
    ctXML = ctXML.replace(
      "</Types>",
      `  <Override PartName="/${targetHeaderFile}"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
</Types>`
    );
    ctChanged = true;
  }

  if (ctChanged) {
    zip.updateFile("[Content_Types].xml", Buffer.from(ctXML, "utf8"));
  }

  return zip.toBuffer();
}

/* ───────────────── MAIN ───────────────── */

async function main() {
  console.log("\n💧 WATERMARK SCRIPT\n");

  const search = process.argv[2];

  const articles = await prisma.article.findMany({
    where: {
      title: { contains: search, mode: "insensitive" },
    },
  });

  console.log("📚 Articles found:", articles.length);

  for (const article of articles) {
    try {
      const url = article.originalWordUrl || article.currentWordUrl;

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
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
      );

      console.log("🎉 Watermark applied");
    } catch (err: any) {
      console.log("❌ ERROR:", err.message);
    }
  }

  console.log("\n✅ Script finished\n");
}

main();