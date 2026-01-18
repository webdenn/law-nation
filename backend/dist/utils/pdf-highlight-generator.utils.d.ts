/**
 * PDF Highlight Generator - Creates PDFs with burned-in highlights
 * Uses pdf-lib to add colored rectangles over changed text
 */
/**
 * Generate a new PDF with highlights burned in
 * @param originalPdfPath - Path to original PDF
 * @param editedPdfPath - Path to edited PDF
 * @param outputPath - Path where highlighted PDF will be saved
 * @returns Path to generated highlighted PDF
 */
export declare function generateHighlightedPdf(originalPdfPath: string, editedPdfPath: string, outputPath: string): Promise<string>;
//# sourceMappingURL=pdf-highlight-generator.utils.d.ts.map