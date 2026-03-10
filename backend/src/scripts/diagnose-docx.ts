import "dotenv/config";
import { prisma } from "../db/db.js";
import { downloadFileToBuffer } from "../utils/pdf-extract.utils.js";
import AdmZip from "adm-zip";
import fs from "fs";

async function diagnoseDocx() {
  console.log("🔍 [Diagnostic] Searching for 'Pretrial punishment' DOCX...");
  
  const article = await prisma.article.findFirst({
    where: { title: { contains: "Pretrial punishment" } },
    select: { currentWordUrl: true, title: true }
  });

  if (!article || !article.currentWordUrl) {
    console.error("❌ Article not found or no DOCX URL");
    process.exit(1);
  }

  console.log(`📄 Found: ${article.title}`);
  console.log(`🌐 URL: ${article.currentWordUrl}`);

  try {
    const buffer = await downloadFileToBuffer(article.currentWordUrl);
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    let output = "";
    for (const entry of entries) {
      if (entry.entryName.startsWith("word/") && entry.entryName.endsWith(".xml")) {
        const content = entry.getData().toString("utf-8");
        
        const matches = content.match(/<(?:v:shape|v:rect|v:image|v:oval|w:pict|w:drawing|wp:extent|a:ext)[^>]*>/gi);
        if (matches) {
          output += `\n--- [ ${entry.entryName} ] ---\n`;
          matches.forEach(m => {
             if (m.includes('width') || m.includes('height') || m.includes('cx') || m.includes('cy')) {
                output += `   FULL MATCH: ${m}\n`;
             }
          });
        }
      }
    }
    fs.writeFileSync("/tmp/docx_diag.txt", output);
    console.log("✅ Diagnostic saved to /tmp/docx_diag.txt");
  } catch (err) {
    console.error("❌ Diagnostic failed:", err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

diagnoseDocx();
