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
    
    // ✅ IMPROVED: Use modified PDF as base for better layout accuracy
    let basePdfPath = modifiedPdfPath;
    if (diffResult.addedCount > diffResult.deletedCount) {
      basePdfPath = modifiedPdfPath; // Use modified if more additions
    } else if (diffResult.deletedCount > 0) {
      basePdfPath = originalPdfPath; // Use original if there are deletions
    }
    
    // Load base PDF
    let fullPath = basePdfPath;
    if (basePdfPath.startsWith('/uploads')) {
      fullPath = path.join(process.cwd(), basePdfPath);
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
          console.log(`   ➕ Additions: ${changes.filter(c => c.type === 'added').length}`);
          console.log(`   ➖ Deletions: ${changes.filter(c => c.type === 'deleted').length}`);
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
 * ✅ IMPROVED: Add visual markup to a page with better positioning and styling
 */
function addMarkupToPage(page: PDFPage, changes: TextChange[]): void {
  const { width, height } = page.getSize();
  
  // ✅ IMPROVED: Sort changes by type to draw deletions first, then additions
  const deletions = changes.filter(c => c.type === 'deleted');
  const additions = changes.filter(c => c.type === 'added');
  
  console.log(`   🔴 Drawing ${deletions.length} deletions`);
  console.log(`   🟢 Drawing ${additions.length} additions`);
  
  // Draw deletions first (red highlights)
  for (const change of deletions) {
    // ✅ IMPROVED: Better coordinate conversion - PDF uses bottom-left origin
    const x = Math.max(0, Math.min(change.x, width - 10));
    const y = Math.max(0, Math.min(height - change.y - change.height, height - 10));
    const rectWidth = Math.max(change.width || 50, 10);
    const rectHeight = Math.max(change.height || 12, 8);
    
    // Draw light red background for deleted text
    page.drawRectangle({
      x: x,
      y: y,
      width: rectWidth,
      height: rectHeight,
      color: rgb(1, 0.85, 0.85), // Light red background
      opacity: 0.7,
    });
    
    // Draw red border
    page.drawRectangle({
      x: x,
      y: y,
      width: rectWidth,
      height: rectHeight,
      borderColor: rgb(0.8, 0, 0), // Dark red border
      borderWidth: 1,
      opacity: 0.9,
    });
    
    // Draw strikethrough line for deleted text
    page.drawLine({
      start: { x: x, y: y + rectHeight / 2 },
      end: { x: x + rectWidth, y: y + rectHeight / 2 },
      color: rgb(0.8, 0, 0), // Dark red line
      thickness: 2,
      opacity: 0.9,
    });
    
    console.log(`     🔴 Deleted "${change.text}" at (${x.toFixed(1)}, ${y.toFixed(1)}) size ${rectWidth.toFixed(1)}x${rectHeight.toFixed(1)}`);
  }
  
  // Draw additions second (green highlights)
  for (const change of additions) {
    // ✅ IMPROVED: Better coordinate conversion
    const x = Math.max(0, Math.min(change.x, width - 10));
    const y = Math.max(0, Math.min(height - change.y - change.height, height - 10));
    const rectWidth = Math.max(change.width || 50, 10);
    const rectHeight = Math.max(change.height || 12, 8);
    
    // Draw light green background for added text
    page.drawRectangle({
      x: x,
      y: y,
      width: rectWidth,
      height: rectHeight,
      color: rgb(0.85, 1, 0.85), // Light green background
      opacity: 0.7,
    });
    
    // Draw green border
    page.drawRectangle({
      x: x,
      y: y,
      width: rectWidth,
      height: rectHeight,
      borderColor: rgb(0, 0.6, 0), // Dark green border
      borderWidth: 1,
      opacity: 0.9,
    });
    
    // Draw green underline for added text
    page.drawLine({
      start: { x: x, y: y },
      end: { x: x + rectWidth, y: y },
      color: rgb(0, 0.6, 0), // Dark green line
      thickness: 2,
      opacity: 0.9,
    });
    
    console.log(`     🟢 Added "${change.text}" at (${x.toFixed(1)}, ${y.toFixed(1)}) size ${rectWidth.toFixed(1)}x${rectHeight.toFixed(1)}`);
  }
  
  // ✅ NEW: Add legend in top-right corner
  if (changes.length > 0) {
    const legendX = width - 150;
    const legendY = height - 30;
    
    // Legend background
    page.drawRectangle({
      x: legendX - 10,
      y: legendY - 25,
      width: 140,
      height: 50,
      color: rgb(1, 1, 1), // White background
      borderColor: rgb(0.7, 0.7, 0.7), // Gray border
      borderWidth: 1,
      opacity: 0.9,
    });
    
    // Legend text
    page.drawText('Visual Diff Legend:', {
      x: legendX,
      y: legendY + 15,
      size: 8,
      color: rgb(0, 0, 0),
    });
    
    if (deletions.length > 0) {
      page.drawRectangle({
        x: legendX,
        y: legendY,
        width: 15,
        height: 8,
        color: rgb(1, 0.85, 0.85),
        borderColor: rgb(0.8, 0, 0),
        borderWidth: 1,
      });
      page.drawText(`Deleted (${deletions.length})`, {
        x: legendX + 20,
        y: legendY + 1,
        size: 7,
        color: rgb(0, 0, 0),
      });
    }
    
    if (additions.length > 0) {
      page.drawRectangle({
        x: legendX,
        y: legendY - 12,
        width: 15,
        height: 8,
        color: rgb(0.85, 1, 0.85),
        borderColor: rgb(0, 0.6, 0),
        borderWidth: 1,
      });
      page.drawText(`Added (${additions.length})`, {
        x: legendX + 20,
        y: legendY - 11,
        size: 7,
        color: rgb(0, 0, 0),
      });
    }
  }
}

/**
 * Generate visual diff from change log
 * @param changeLogId - Change log ID
 * @param articleId - Article ID
 * @param versionNumber - Version number
 * @param originalPdfPath - Path to original PDF
 * @param modifiedPdfPath - Path to modified PDF
 * @param outputPath - Full path where to save the visual diff PDF
 * @returns Path to generated visual diff PDF
 */
export async function generateVisualDiffFromChangeLog(
  changeLogId: string,
  articleId: string,
  versionNumber: number,
  originalPdfPath: string,
  modifiedPdfPath: string,
  outputPath: string
): Promise<string> {
  console.log(`🎨 [Visual Diff] Starting visual diff generation...`);
  console.log(`📄 [Visual Diff] Original: ${originalPdfPath}`);
  console.log(`📄 [Visual Diff] Modified: ${modifiedPdfPath}`);
  console.log(`💾 [Visual Diff] Output: ${outputPath}`);
  
  // Generate visual diff
  return await generateVisualDiffPdf(originalPdfPath, modifiedPdfPath, outputPath);
}


