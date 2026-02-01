/**
 * Visual Diff Generator - Creates PDFs with burned-in highlights
 */
/**
 * Generate visual diff PDF with burned-in highlights
 * @param originalPdfPath - Path to original PDF
 * @param modifiedPdfPath - Path to modified PDF
 * @param outputPath - Path where highlighted PDF will be saved
 * @returns Path to generated highlighted PDF
 */
export declare function generateVisualDiffPdf(originalPdfPath: string, modifiedPdfPath: string, outputPath: string): Promise<string>;
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
export declare function generateVisualDiffFromChangeLog(changeLogId: string, articleId: string, versionNumber: number, originalPdfPath: string, modifiedPdfPath: string, outputPath: string): Promise<string>;
//# sourceMappingURL=pdf-visual-diff.utils.d.ts.map