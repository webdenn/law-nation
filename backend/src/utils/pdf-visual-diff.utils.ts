/**
 * Visual Diff Generator - Updated to use Overlay Approach
 * No more PDF.js coordinate complexity, just overlay data for frontend
 */

import { generateOverlayVisualDiff, generateOverlayVisualDiffFromChangeLog } from './overlay-visual-diff.utils.js';
import type { VisualDiffResponse } from './overlay-visual-diff.utils.js';

/**
 * Generate visual diff PDF with overlay approach (no PDF generation)
 * @param originalPdfPath - Path to original PDF
 * @param modifiedPdfPath - Path to modified PDF
 * @param outputPath - Not used in overlay approach (kept for compatibility)
 * @returns Path to existing edited PDF (no new file generated)
 */
export async function generateVisualDiffPdf(
  originalPdfPath: string,
  modifiedPdfPath: string,
  outputPath: string
): Promise<string> {
  console.log('\n🎨 [Visual Diff] Starting visual diff generation (overlay approach)...');
  console.log(`📄 [Visual Diff] Original: ${originalPdfPath}`);
  console.log(`📄 [Visual Diff] Modified: ${modifiedPdfPath}`);
  console.log(`💾 [Visual Diff] Output path (ignored in overlay): ${outputPath}`);
  
  try {
    // Use new overlay approach instead of PDF.js
    const overlayResult: VisualDiffResponse = await generateOverlayVisualDiff(originalPdfPath, modifiedPdfPath);
    
    if (!overlayResult.success) {
      console.error('❌ [Visual Diff] Overlay generation failed:', overlayResult.message);
      throw new Error(overlayResult.message);
    }
    
    console.log('✅ [Visual Diff] Overlay visual diff generated successfully');
    console.log(`📄 [Visual Diff] Returning existing PDF: ${overlayResult.pdfPath}`);
    console.log(`🎨 [Visual Diff] Highlights: ${overlayResult.highlightData.highlights.length}`);
    console.log(`📊 [Visual Diff] Changes: +${overlayResult.summary.addedCount} -${overlayResult.summary.removedCount} ~${overlayResult.summary.modifiedCount}`);
    
    // Return existing edited PDF path (no new file generated)
    return overlayResult.pdfPath;
    
  } catch (error) {
    console.error('❌ [Visual Diff] Failed to generate visual diff:', error);
    throw new Error(`Failed to generate visual diff: ${error}`);
  }
}

/**
 * Generate visual diff from change log using overlay approach
 * @param changeLogId - Change log ID
 * @param articleId - Article ID
 * @param versionNumber - Version number
 * @param originalPdfPath - Path to original PDF
 * @param modifiedPdfPath - Path to modified PDF
 * @param outputPath - Not used in overlay approach (kept for compatibility)
 * @returns Path to existing edited PDF (no new file generated)
 */
export async function generateVisualDiffFromChangeLog(
  changeLogId: string,
  articleId: string,
  versionNumber: number,
  originalPdfPath: string,
  modifiedPdfPath: string,
  outputPath: string
): Promise<string> {
  console.log('\n🎨 [Visual Diff Log] Starting visual diff from change log (overlay approach)...');
  console.log(`📋 [Visual Diff Log] Change Log ID: ${changeLogId}`);
  console.log(`📄 [Visual Diff Log] Article ID: ${articleId}`);
  console.log(`🔢 [Visual Diff Log] Version: ${versionNumber}`);
  console.log(`📄 [Visual Diff Log] Original: ${originalPdfPath}`);
  console.log(`📄 [Visual Diff Log] Modified: ${modifiedPdfPath}`);
  console.log(`💾 [Visual Diff Log] Output path (ignored in overlay): ${outputPath}`);
  
  try {
    // Use new overlay approach for change log
    const overlayResult: VisualDiffResponse = await generateOverlayVisualDiffFromChangeLog(
      changeLogId,
      articleId,
      versionNumber,
      originalPdfPath,
      modifiedPdfPath
    );
    
    if (!overlayResult.success) {
      console.error('❌ [Visual Diff Log] Overlay generation failed:', overlayResult.message);
      throw new Error(overlayResult.message);
    }
    
    console.log('✅ [Visual Diff Log] Change log visual diff generated successfully');
    console.log(`📄 [Visual Diff Log] Returning existing PDF: ${overlayResult.pdfPath}`);
    console.log(`🎨 [Visual Diff Log] Highlights: ${overlayResult.highlightData.highlights.length}`);
    
    // Return existing edited PDF path (no new file generated)
    return overlayResult.pdfPath;
    
  } catch (error) {
    console.error('❌ [Visual Diff Log] Failed to generate change log visual diff:', error);
    throw new Error(`Failed to generate visual diff from change log: ${error}`);
  }
}
