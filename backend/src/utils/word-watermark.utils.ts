import fs from "fs/promises";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Header,
  ExternalHyperlink,
  ImageRun,
} from "docx";
import { createRequire } from "module";
import { NotFoundError } from "@/utils/http-errors.util.js";

// Create require for CommonJS modules (mammoth)
const require = createRequire(import.meta.url);

/**
 * Helper function to safely resolve file path
 * Handles both relative paths and absolute Windows paths
 */
function resolveFilePath(filePath: string): string {
  return path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
}

/**
 * Add watermark to Word document (simple version - returns original for now)
 */
export async function addWatermarkToWord(
  wordPath: string,
  watermarkData: {
    userName: string;
    downloadDate: Date;
    articleTitle: string;
    articleId: string;
    frontendUrl: string;
  }
): Promise<Buffer> {
  try {
    console.log(`💧 [Word Watermark] Adding watermark to: ${wordPath}`);

    const fullPath = resolveFilePath(wordPath);
    console.log(`📂 [Word Watermark] Resolved full path: ${fullPath}`);

    // ✅ Check if file exists before attempting to read
    try {
      await fs.access(fullPath);
      console.log(`✅ [Word Watermark] File exists and is accessible`);
    } catch (accessError: any) {
      console.error(`❌ [Word Watermark] File not found: ${fullPath}`);
      if (accessError?.code === "ENOENT") {
        throw new NotFoundError(
          `Document file not found on server: ${path.basename(fullPath)}`
        );
      }
      throw new Error(
        `Cannot access file: ${accessError?.message || "Unknown access error"}`
      );
    }

    // Read the original Word file
    const originalBuffer = await fs.readFile(fullPath);

    const watermarkText = `Downloaded by: ${
      watermarkData.userName
    } | Date: ${watermarkData.downloadDate.toLocaleDateString()} | Article: ${
      watermarkData.articleTitle
    }`;

    console.log(`💧 [Word Watermark] Watermark text: ${watermarkText}`);

    console.log(
      `⚠️ [Word Watermark] Note: Full Word watermarking requires additional libraries`
    );
    console.log(`💡 [Word Watermark] Returning original document for now`);
    console.log(
      `💡 [Word Watermark] Consider using: docx-templates, officegen, or docxtemplater`
    );

    // For now, return the original buffer
    // TODO: Implement full watermarking with docx-templates or similar
    return originalBuffer;
  } catch (error: any) {
    console.error("❌ [Word Watermark] Failed to add watermark:", error);

    // Handle specific error types
    if (error instanceof NotFoundError) {
      // Re-throw NotFoundError for proper API response
      throw error;
    }

    if (error?.code === "ENOENT") {
      throw new NotFoundError(
        `Document file not found on server: ${path.basename(wordPath)}`
      );
    }

    if (error?.code === "EACCES") {
      throw new Error("Permission denied: Cannot access document file");
    }

    throw new Error(
      `Failed to add watermark to Word document: ${
        error?.message || "Unknown error"
      }`
    );
  }
}

/**
 * Add simple text watermark to Word document
 * This creates a new document with watermark header and original content
 * Note: This is a simplified version. For production, use docx-templates
 */
export async function addSimpleWatermarkToWord(
  wordPath: string,
  watermarkData: {
    userName: string;
    downloadDate: Date;
    articleTitle: string;
    articleId: string;
    frontendUrl: string;
  }
): Promise<Buffer> {
  try {
    console.log(
      `💧 [Word Watermark] Adding watermark with logo to: ${wordPath}`
    );

    const fullPath = resolveFilePath(wordPath);
    console.log(`📂 [Word Watermark] Resolved full path: ${fullPath}`);

    // ✅ Check if file exists before attempting to read
    try {
      await fs.access(fullPath);
      console.log(`✅ [Word Watermark] File exists and is accessible`);
    } catch (accessError: any) {
      console.error(`❌ [Word Watermark] File not found: ${fullPath}`);
      if (accessError?.code === "ENOENT") {
        throw new NotFoundError(
          `Document file not found on server: ${path.basename(fullPath)}`
        );
      }
      throw new Error(
        `Cannot access file: ${accessError?.message || "Unknown access error"}`
      );
    }

    // Read the original Word file
    const originalBuffer = await fs.readFile(fullPath);

    // Extract text from original document using mammoth
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer: originalBuffer });
    const originalText = result.value;

    console.log(
      `📄 [Word Watermark] Extracted ${originalText.length} characters`
    );

    // Load company logo
    let logoImageData: Buffer | null = null;
    try {
      const logoPath = path.join(
        process.cwd(),
        "src",
        "assets",
        "img",
        "Screenshot 2026-01-09 204120.png"
      );
      console.log(`🖼️ [Word Watermark] Loading logo from: ${logoPath}`);

      if (
        await fs
          .access(logoPath)
          .then(() => true)
          .catch(() => false)
      ) {
        logoImageData = await fs.readFile(logoPath);
        console.log(
          `✅ [Word Watermark] Logo loaded successfully (${logoImageData.length} bytes)`
        );
      } else {
        console.warn(`⚠️ [Word Watermark] Logo file not found, skipping logo`);
      }
    } catch (error: any) {
      console.warn(`⚠️ [Word Watermark] Failed to load logo:`, error?.message);
    }

    // Create watermark text and link
    const downloadDate = watermarkData.downloadDate.toLocaleDateString("en-GB"); // DD/MM/YYYY format
    const mainWatermark = `DOWNLOADED FROM LAW NATION DATE ${downloadDate}`;
    const userInfo = `User: ${watermarkData.userName} | Article: ${watermarkData.articleTitle}`;
    const articleUrl = `${watermarkData.frontendUrl}/articles/${watermarkData.articleId}`;

    console.log(`💧 [Word Watermark] Main watermark: ${mainWatermark}`);
    console.log(`💧 [Word Watermark] User info: ${userInfo}`);
    console.log(`🔗 [Word Watermark] Article link: ${articleUrl}`);

    // Create header children array
    const headerChildren: Paragraph[] = [];

    // Add logo if available
    if (logoImageData) {
      headerChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 100, // Space after logo
          },
          children: [
            new ImageRun({
              data: logoImageData,
              transformation: {
                width: 150, // Logo width in pixels
                height: 75, // Logo height in pixels (adjust based on aspect ratio)
              },
              type: "png",
            }),
          ],
        })
      );
    }

    // Add text watermark to header
    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: mainWatermark,
            size: 16, // 8pt
            color: "999999",
            italics: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: userInfo,
            size: 14, // 7pt
            color: "AAAAAA",
            italics: true,
          }),
        ],
      })
    );

    // Create new document with watermark
    const doc = new Document({
      sections: [
        {
          headers: {
            default: new Header({
              children: headerChildren,
            }),
          },
          children: [
            // Top watermark section
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "═══════════════════════════════════════",
                  color: "CCCCCC",
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: mainWatermark,
                  size: 20,
                  color: "666666",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: userInfo,
                  size: 16,
                  color: "888888",
                  italics: true,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "View online: ",
                  size: 16,
                  color: "666666",
                }),
                new ExternalHyperlink({
                  children: [
                    new TextRun({
                      text: articleUrl,
                      size: 16,
                      color: "0000FF",
                      underline: {},
                    }),
                  ],
                  link: articleUrl,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "═══════════════════════════════════════",
                  color: "CCCCCC",
                }),
              ],
            }),
            new Paragraph({ text: "" }), // Empty line

            // Original content (simple paragraph split)
            ...originalText.split("\n\n").map(
              (paragraph: string) =>
                new Paragraph({
                  children: [new TextRun(paragraph.trim())],
                })
            ),

            // Bottom watermark section
            new Paragraph({ text: "" }), // Empty line
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "═══════════════════════════════════════",
                  color: "CCCCCC",
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: mainWatermark,
                  size: 20,
                  color: "666666",
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: userInfo,
                  size: 16,
                  color: "888888",
                  italics: true,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "View online: ",
                  size: 16,
                  color: "666666",
                }),
                new ExternalHyperlink({
                  children: [
                    new TextRun({
                      text: articleUrl,
                      size: 16,
                      color: "0000FF",
                      underline: {},
                    }),
                  ],
                  link: articleUrl,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "═══════════════════════════════════════",
                  color: "CCCCCC",
                }),
              ],
            }),
          ],
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    console.log(`✅ [Word Watermark] Watermark added successfully`);
    console.log(`📦 [Word Watermark] Output size: ${buffer.length} bytes`);

    return buffer;
  } catch (error: any) {
    console.error("❌ [Word Watermark] Failed to add watermark:", error);

    // Handle specific error types
    if (error instanceof NotFoundError) {
      // Re-throw NotFoundError for proper API response
      throw error;
    }

    if (error?.code === "ENOENT") {
      throw new NotFoundError(
        `Document file not found on server: ${path.basename(wordPath)}`
      );
    }

    if (error?.code === "EACCES") {
      throw new Error("Permission denied: Cannot access document file");
    }

    console.error("❌ [Word Watermark] Falling back to error response");
    throw new Error(
      `Failed to process Word document: ${error?.message || "Unknown error"}`
    );
  }
}
