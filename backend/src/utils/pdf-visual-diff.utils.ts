/**
 * Visual Diff Generator - Creates PDFs with burned-in highlights
 */

import { generateHighlightedPdf } from './pdf-highlight-generator.utils.js';

/**
 * Generate visual diff PDF with burned-in highlights
 * @param originalPdfPath - Path to original PDF
 * @param modifiedPdfPath - Path to modified PDF
 * @param outputPath - Path where highlighted PDF will be saved
 * @returns Path to generated highlighted PDF
 */
export async function generateVisualDiffPdf(
  originalPdfPath: string,
  modifiedPdfPath: string,
  outputPath: string
): Promise<string> {
  console.log('\n🎨 [Visual Diff] Starting visual diff PDF generation...');
  console.log(`📄 [Visual Diff] Original: ${originalPdfPath}`);
  console.log(`📄 [Visual Diff] Modified: ${modifiedPdfPath}`);
  console.log(`💾 [Visual Diff] Output: ${outputPath}`);
  
  try {
    // Generate PDF with burned-in highlights
    const highlightedPdfPath = await generateHighlightedPdf(
      originalPdfPath,
      modifiedPdfPath,
      outputPath
    );
    
    console.log('✅ [Visual Diff] Visual diff PDF generated successfully');
    console.log(`📄 [Visual Diff] Output file: ${highlightedPdfPath}`);
    
    return highlightedPdfPath;
    
  } catch (error) {
    console.error('❌ [Visual Diff] Failed to generate visual diff PDF:', error);
    throw new Error(`Failed to generate visual diff: ${error}`);
  }
}

/**
 * Generate visual diff from change log with burned-in highlights
 * @param changeLogId - Change log ID
 * @param articleId - Article ID
 * @param versionNumber - Version number
 * @param originalPdfPath - Path to original PDF
 * @param modifiedPdfPath - Path to modified PDF
 * @param outputPath - Path where highlighted PDF will be saved
 * @returns Path to generated highlighted PDF
 */
export async function generateVisualDiffFromChangeLog(
  changeLogId: string,
  articleId: string,
  versionNumber: number,
  originalPdfPath: string,
  modifiedPdfPath: string,
  outputPath: string
): Promise<string> {
  console.log('\n🎨 [Visual Diff Log] Starting visual diff from change log...');
  console.log(`📋 [Visual Diff Log] Change Log ID: ${changeLogId}`);
  console.log(`📄 [Visual Diff Log] Article ID: ${articleId}`);
  console.log(`🔢 [Visual Diff Log] Version: ${versionNumber}`);
  console.log(`📄 [Visual Diff Log] Original: ${originalPdfPath}`);
  console.log(`📄 [Visual Diff Log] Modified: ${modifiedPdfPath}`);
  console.log(`💾 [Visual Diff Log] Output: ${outputPath}`);
  
  try {
    // Generate PDF with burned-in highlights
    const highlightedPdfPath = await generateHighlightedPdf(
      originalPdfPath,
      modifiedPdfPath,
      outputPath
    );
    
    console.log('✅ [Visual Diff Log] Change log visual diff generated successfully');
    console.log(`📄 [Visual Diff Log] Output file: ${highlightedPdfPath}`);
    
    return highlightedPdfPath;
    
  } catch (error) {
    console.error('❌ [Visual Diff Log] Failed to generate change log visual diff:', error);
    throw new Error(`Failed to generate visual diff from change log: ${error}`);
  }
}


