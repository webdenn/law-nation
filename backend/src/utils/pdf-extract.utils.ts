// src/utils/pdf-extract.utils.ts

import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Load pdf-parse (CommonJS module)
const { PDFParse } = require("pdf-parse");

console.log("✅ pdf-parse loaded. PDFParse type:", typeof PDFParse);

// Note: downloadFileToBuffer is kept for future use with remote URLs
// Currently PDFParse can handle URLs directly via { url: ... }
async function downloadFileToBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(chunk as Buffer));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    }).on("error", reject);
  });
}

// Suppress unused warning - function kept for potential future use
void downloadFileToBuffer;

export async function extractPdfText(pdfPath: string): Promise<string> {
  console.log("\n🔍 [PDF Extract] Starting extraction...");
  console.log("📄 [PDF Extract] Path:", pdfPath);
  
  try {
    let parser;

    if (pdfPath.startsWith("http://") || pdfPath.startsWith("https://")) {
      console.log("🌐 [PDF Extract] Remote URL detected");
      console.log("📥 [PDF Extract] Downloading from:", pdfPath);
      
      // Use URL directly with new API
      parser = new PDFParse({ url: pdfPath });
      console.log("✅ [PDF Extract] Parser created with URL");
    } else {
      console.log("💾 [PDF Extract] Local file detected");
      
      let filePath = pdfPath;
      if (pdfPath.startsWith("/uploads")) {
        filePath = path.join(process.cwd(), pdfPath);
        console.log("🔄 [PDF Extract] Converted to absolute path:", filePath);
      }

      console.log("🔍 [PDF Extract] Checking if file exists...");
      if (!fs.existsSync(filePath)) {
        console.error("❌ [PDF Extract] File not found:", filePath);
        console.log("📁 [PDF Extract] Current directory:", process.cwd());
        
        // List files in uploads directory
        try {
          const uploadsDir = path.join(process.cwd(), "uploads");
          if (fs.existsSync(uploadsDir)) {
            console.log("📂 [PDF Extract] Files in uploads/:");
            const dirs = fs.readdirSync(uploadsDir);
            dirs.forEach(dir => {
              const dirPath = path.join(uploadsDir, dir);
              if (fs.statSync(dirPath).isDirectory()) {
                const files = fs.readdirSync(dirPath);
                console.log(`   📁 ${dir}/ (${files.length} files)`);
                files.slice(0, 3).forEach(f => console.log(`      📄 ${f}`));
                if (files.length > 3) console.log(`      ... and ${files.length - 3} more`);
              }
            });
          }
        } catch (e) {
          console.error("⚠️ [PDF Extract] Could not list uploads directory");
        }
        
        return "";
      }

      const stats = fs.statSync(filePath);
      console.log(`✅ [PDF Extract] File found! Size: ${stats.size} bytes (${(stats.size / 1024).toFixed(2)} KB)`);
      
      console.log("📖 [PDF Extract] Reading file into buffer...");
      const dataBuffer = fs.readFileSync(filePath);
      console.log(`✅ [PDF Extract] Buffer created: ${dataBuffer.length} bytes`);
      
      // Use buffer with new API
      console.log("🔧 [PDF Extract] Creating PDFParse instance...");
      parser = new PDFParse({ data: dataBuffer });
      console.log("✅ [PDF Extract] Parser created with buffer");
    }

    console.log("⚙️ [PDF Extract] Starting text extraction...");
    
    // Extract text using new API
    const result = await parser.getText();
    console.log("✅ [PDF Extract] getText() completed");
    
    console.log("🧹 [PDF Extract] Cleaning up parser...");
    await parser.destroy(); // Clean up resources
    console.log("✅ [PDF Extract] Parser destroyed");

    const text = result.text || "";
    console.log(`📊 [PDF Extract] Extraction complete!`);
    console.log(`   📝 Text length: ${text.length} characters`);
    console.log(`   📄 First 100 chars: ${text.substring(0, 100).replace(/\n/g, ' ')}`);

    if (text.trim().length === 0) {
      console.warn("⚠️ [PDF Extract] WARNING: No text found in PDF!");
      console.warn("   This usually means:");
      console.warn("   - PDF is scanned (image-based)");
      console.warn("   - PDF is encrypted/protected");
      console.warn("   - PDF is corrupted");
    } else {
      console.log("✅ [PDF Extract] Text extraction successful!");
    }

    return text;
  } catch (error: unknown) {
    console.error("❌ [PDF Extract] EXTRACTION FAILED!");
    console.error("❌ [PDF Extract] Error type:", error?.constructor?.name || typeof error);
    console.error("❌ [PDF Extract] Error message:", error instanceof Error ? error.message : String(error));
    console.error("❌ [PDF Extract] Full error:", error);
    return "";
  }
}

export function convertTextToHtml(text: string): string {
  if (!text) return "";

  const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return paragraphs
    .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

export async function extractPdfContent(pdfPath: string) {
  const text = await extractPdfText(pdfPath);
  const html = convertTextToHtml(text);

  return { text, html };
}