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
import { resolveToAbsolutePath, fileExistsAtPath } from "@/utils/file-path.utils.js";
import { downloadFileToBuffer } from './pdf-extract.utils.js';

// Create require for CommonJS modules (mammoth)
const require = createRequire(import.meta.url);

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

    // ✅ Check if file exists or is a URL
    let originalBuffer: Buffer;
    const isUrl = wordPath.startsWith('http://') || wordPath.startsWith('https://');

    if (isUrl) {
      console.log(`🌐 [Word Watermark] Downloading from URL: ${wordPath}`);
      originalBuffer = await downloadFileToBuffer(wordPath);
    } else {
      const fullPath = resolveToAbsolutePath(wordPath);
      console.log(`📂 [Word Watermark] Resolved full path: ${fullPath}`);

      if (!fileExistsAtPath(wordPath)) {
        console.error(`❌ [Word Watermark] File not found: ${fullPath}`);
        throw new NotFoundError(
          `Document file not found on server: ${path.basename(fullPath)}`
        );
      }
      console.log(`✅ [Word Watermark] File exists and is accessible`);
      originalBuffer = await fs.readFile(fullPath);
    }

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

    // For now, call addSimpleWatermarkToWord for actual watermarking
    return await addSimpleWatermarkToWord(wordPath, watermarkData);
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

    // ✅ Check if file exists or is a URL
    let originalBuffer: Buffer;
    const isUrl = wordPath.startsWith('http://') || wordPath.startsWith('https://');

    if (isUrl) {
      console.log(`🌐 [Word Watermark] Downloading from URL: ${wordPath}`);
      originalBuffer = await downloadFileToBuffer(wordPath);
    } else {
      const fullPath = resolveToAbsolutePath(wordPath);
      console.log(`📂 [Word Watermark] Resolved full path: ${fullPath}`);

      if (!fileExistsAtPath(wordPath)) {
        console.error(`❌ [Word Watermark] File not found: ${fullPath}`);
        throw new NotFoundError(
          `Document file not found on server: ${path.basename(fullPath)}`
        );
      }
      console.log(`✅ [Word Watermark] File exists and is accessible`);
      originalBuffer = await fs.readFile(fullPath);
    }

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
      // ✅ Handle both "assets" and "assests" typo
      const possibleLogoPaths = [
        path.join(process.cwd(), "src", "assets", "img", "logo-bg.png"),
        path.join(process.cwd(), "src", "assests", "img", "logo-bg.png"),
        path.join(process.cwd(), "backend", "src", "assets", "img", "logo-bg.png")
      ];

      let logoPath = "";
      for (const p of possibleLogoPaths) {
        if (await fs.access(p).then(() => true).catch(() => false)) {
          logoPath = p;
          break;
        }
      }

      if (logoPath) {
        console.log(`🖼️ [Word Watermark] Loading logo from: ${logoPath}`);
        logoImageData = await fs.readFile(logoPath);
        console.log(`✅ [Word Watermark] Logo loaded successfully (${logoImageData.length} bytes)`);
      } else {
        console.warn(`⚠️ [Word Watermark] Logo file not found among possible paths, skipping logo`);
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
