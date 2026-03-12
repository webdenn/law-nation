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

/* ───────────────── APPLY WATERMARK ───────────────── */

function applyWatermark(buffer) {

const zip = new AdmZip(buffer);

/* INSERT IMAGE */

const img = fs.readFileSync(WATERMARK_PATH);

zip.addFile("word/media/logo-bg.png", img);

/* HEADER */

let headerEntry = zip.getEntry("word/header1.xml");

if (!headerEntry) {

const header = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">

${watermarkXML()}

</w:hdr>`;

zip.addFile("word/header1.xml", Buffer.from(header));

} else {

let xml = headerEntry.getData().toString();

if (!xml.includes("law-nation-watermark")) {

xml = xml.replace("</w:hdr>", watermarkXML() + "\n</w:hdr>");

zip.updateFile("word/header1.xml", Buffer.from(xml));

}

}

/* HEADER RELATIONSHIP */

const relPath = "word/_rels/header1.xml.rels";

const headerRelXML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship
Id="rIdWatermark"
Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
Target="media/logo-bg.png"/>
</Relationships>`;

const relEntry = zip.getEntry(relPath);

if (!relEntry) {

zip.addFile(relPath, Buffer.from(headerRelXML));

} else {

let xml = relEntry.getData().toString();

if (!xml.includes("logo-bg.png")) {

xml = xml.replace(
"</Relationships>",
`<Relationship
Id="rIdWatermark"
Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
Target="media/logo-bg.png"/>
</Relationships>`
);

zip.updateFile(relPath, Buffer.from(xml));

}

}

/* LINK HEADER TO DOCUMENT */

const documentXML = zip.getEntry("word/document.xml");

let doc = documentXML.getData().toString();

if (!doc.includes("headerReference")) {

doc = doc.replace(
"</w:sectPr>",
`<w:headerReference w:type="default" r:id="rIdHeader1"/>
</w:sectPr>`
);

zip.updateFile("word/document.xml", Buffer.from(doc));

}

/* DOCUMENT RELATIONSHIP */

const docRelPath = "word/_rels/document.xml.rels";

const docRelEntry = zip.getEntry(docRelPath);

let relXML = docRelEntry.getData().toString();

if (!relXML.includes("header1.xml")) {

relXML = relXML.replace(
"</Relationships>",
`<Relationship
Id="rIdHeader1"
Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header"
Target="header1.xml"/>
</Relationships>`
);

zip.updateFile(docRelPath, Buffer.from(relXML));

}

/* FIX CONTENT TYPES */

const ctEntry = zip.getEntry("[Content_Types].xml");

let ctXML = ctEntry.getData().toString();

if (!ctXML.includes("header1.xml")) {

ctXML = ctXML.replace(
"</Types>",
`<Override PartName="/word/header1.xml"
ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
</Types>`
);

zip.updateFile("[Content_Types].xml", Buffer.from(ctXML));

}

return zip.toBuffer();

}

/* ───────────────── MAIN ───────────────── */

async function main() {

console.log("\n💧 WATERMARK SCRIPT\n");

const search = process.argv[2];

const articles = await prisma.article.findMany({
where: {
title: { contains: search, mode: "insensitive" }
}
});

console.log("Articles:", articles.length);

for (const article of articles) {

try {

const url = article.originalWordUrl || article.currentWordUrl;

const buffer = await downloadFileToBuffer(url);

const modified = applyWatermark(buffer);

const key = new URL(url).pathname.slice(1);

await s3.send(
new PutObjectCommand({
Bucket: S3_BUCKET,
Key: key,
Body: modified,
ContentType:
"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
})
);

console.log("Watermark applied:", article.title);

} catch (err) {

console.log("ERROR:", err.message);

}

}

console.log("\nDone\n");

}
// 

main();