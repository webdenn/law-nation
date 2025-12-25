import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

/**
 * Download file from URL to buffer
 * @param url - URL to download from
 * @returns Buffer containing file data
 */
async function downloadFileToBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: ${response.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      
      response.on("data", (chunk) => {
        chunks.push(chunk);
      });

      response.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      response.on("error", (error) => {
        reject(error);
      });
    }).on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Extract text content from PDF file
 * @param pdfPath - Path to PDF file (can be URL, local path, or Supabase URL)
 * @returns Extracted text content
 */
export async function extractPdfText(pdfPath: string): Promise<string> {
  try {
    // Dynamic import for pdf-parse (handles both ESM and CommonJS)
    const pdfParseModule: any = await import("pdf-parse");
    const pdfParse = pdfParseModule.default || pdfParseModule;

    let dataBuffer: Buffer;

    // Check if it's a remote URL (Supabase or other)
    if (pdfPath.startsWith("http://") || pdfPath.startsWith("https://")) {
      console.log(`Downloading PDF from URL: ${pdfPath}`);
      dataBuffer = await downloadFileToBuffer(pdfPath);
    } else {
      // Local file path
      let filePath = pdfPath;
      
      // If it's a URL path (starts with /uploads), convert to file system path
      if (pdfPath.startsWith("/uploads")) {
        filePath = path.join(process.cwd(), pdfPath);
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`PDF file not found: ${filePath}`);
        return "";
      }

      // Read PDF file from disk
      dataBuffer = fs.readFileSync(filePath);
    }
    
    // Extract text using pdf-parse
    const data = await pdfParse(dataBuffer);
    
    // Return extracted text
    return data.text || "";
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    return "";
  }
}

/**
 * Convert plain text to basic HTML with paragraphs
 * @param text - Plain text content
 * @returns HTML formatted content
 */
export function convertTextToHtml(text: string): string {
  if (!text) return "";

  // Split by double newlines (paragraphs)
  const paragraphs = text
    .split(/\n\n+/)
    .map((para) => para.trim())
    .filter((para) => para.length > 0);

  // Wrap each paragraph in <p> tags
  const html = paragraphs
    .map((para) => {
      // Replace single newlines with <br>
      const formatted = para.replace(/\n/g, "<br>");
      return `<p>${formatted}</p>`;
    })
    .join("\n");

  return html;
}

/**
 * Extract text and convert to HTML in one step
 * @param pdfPath - Path to PDF file
 * @returns Object with both text and HTML content
 */
export async function extractPdfContent(pdfPath: string): Promise<{
  text: string;
  html: string;
}> {
  const text = await extractPdfText(pdfPath);
  const html = convertTextToHtml(text);

  return {
    text,
    html,
  };
}
