import { PDFDocument, rgb, PDFPage } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { calculatePdfDifferences } from './pdf-diff-calculator.utils.js';
import type { TextChange } from './pdf-diff-calculator.utils.js';

/**
 * Generate visual diff PDF with markup
 * @param originalPdfPath - Path to original PDF
 * @param modifiedPdfPath - Path to modified PDF
 * @param outputPath - Path to save visual diff PDF
 * @returns Path to generated visual diff PDF
 */
export async function generateVisualDiffPdf(
  originalPdfPath: string,
  modifiedPdfPath: string,
  outputPath: string
): Promise<string> {
  console.log('\n🎨 [Visual Diff] Starting visual diff generation...');
  console.log(`📄 [Visual Diff] Original: ${originalPdfPath}`);
  console.log(`📄 [Visual Diff] Modified: ${modifiedPdfPath}`);
  console.log(`💾 [Visual Diff] Output: ${outputPath}`);
  
  try {
    // Calculate differences
    const diffResult = await calculatePdfDifferences(originalPdfPath, modifiedPdfPath);
    
    console.log(`📊 [Visual Diff] Processing ${diffResult.changes.length} changes`);
    
    // Load original PDF
    let fullPath = originalPdfPath;
    if (originalPdfPath.startsWith('/uploads')) {
      fullPath = path.join(process.cwd(), originalPdfPath);
    }
    
    const pdfBytes = fs.readFileSync(fullPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    console.log(`📄 [Visual Diff] PDF has ${pages.length} pages`);
    
    // Group changes by page
    const changesByPage = new Map<number, TextChange[]>();
    for (const change of diffResult.changes) {
      if (!changesByPage.has(change.page)) {
        changesByPage.set(change.page, []);
      }
      changesByPage.get(change.page)!.push(change);
    }
    
    console.log(`📊 [Visual Diff] Changes across ${changesByPage.size} pages`);
    
    // Add visual markup to each page
    for (const [pageNum, changes] of changesByPage.entries()) {
      if (pageNum > 0 && pageNum <= pages.length) {
        const page = pages[pageNum - 1];
        if (page) {
          console.log(`🎨 [Visual Diff] Adding markup to page ${pageNum}: ${changes.length} changes`);
          addMarkupToPage(page, changes);
        }
      }
    }
    
    // Save visual diff PDF
    const visualDiffBytes = await pdfDoc.save();
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, visualDiffBytes);
    
    console.log(`✅ [Visual Diff] Visual diff generated successfully`);
    console.log(`📊 [Visual Diff] File size: ${(visualDiffBytes.length / 1024).toFixed(2)} KB`);
    console.log(`💾 [Visual Diff] Saved to: ${outputPath}`);
    
    return outputPath;
    
  } catch (error) {
    console.error('❌ [Visual Diff] Failed:', error);
    throw new Error(`Failed to generate visual diff PDF: ${error}`);
  }
}

/**
 * Add visual markup to a page
 */
function addMarkupToPage(page: PDFPage, changes: TextChange[]): void {
  const { height } = page.getSize();
  
  for (const change of changes) {
    // Convert Y coordinate (PDF uses bottom-left origin, we use top-left)
    const y = height - change.y - change.height;
    
    if (change.type === 'deleted') {
      // Draw light red background
      page.drawRectangle({
        x: change.x,
        y: y,
        width: change.width || 50, // Default width if not available
        height: change.height || 12, // Default height if not available
        color: rgb(1, 0.9, 0.9), // Light red
        opacity: 0.6,
      });
      
      // Draw red strikethrough line
      page.drawLine({
        start: { x: change.x, y: y + (change.height || 12) / 2 },
        end: { x: change.x + (change.width || 50), y: y + (change.height || 12) / 2 },
        color: rgb(1, 0, 0), // Red
        thickness: 2,
        opacity: 0.8,
      });
      
    } else if (change.type === 'added') {
      // Draw light green background
      page.drawRectangle({
        x: change.x,
        y: y,
        width: change.width || 50,
        height: change.height || 12,
        color: rgb(0.9, 1, 0.9), // Light green
        opacity: 0.6,
      });
      
      // Draw green underline
      page.drawLine({
        start: { x: change.x, y: y },
        end: { x: change.x + (change.width || 50), y: y },
        color: rgb(0, 0.7, 0), // Green
        thickness: 2,
        opacity: 0.8,
      });
    }
  }
}

/**
 * Generate visual diff from change log
 * @param changeLogId - Change log ID
 * @param originalPdfPath - Path to original PDF
 * @param modifiedPdfPath - Path to modified PDF
 * @returns Path to generated visual diff PDF
 */
export async function generateVisualDiffFromChangeLog(
  changeLogId: string,
  articleId: string,
  versionNumber: number,
  originalPdfPath: string,
  modifiedPdfPath: string
): Promise<string> {
  // Generate output path
  const outputFileName = `visual-diff-v${versionNumber}-${articleId}.pdf`;
  const outputPath = path.join(process.cwd(), 'uploads', 'visual-diffs', outputFileName);
  
  // Generate visual diff
  return await generateVisualDiffPdf(originalPdfPath, modifiedPdfPath, outputPath);
}
