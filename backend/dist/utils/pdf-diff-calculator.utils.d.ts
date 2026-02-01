/**
 * PDF Diff Calculator - Cleaned up, PDF.js removed
 * Only contains simple text diff for change history using pdf-parse
 */
/**
 * Simple diff result for change history (counts only)
 */
export interface SimpleDiffResult {
    addedCount: number;
    deletedCount: number;
    modifiedCount: number;
    totalChanges: number;
}
/**
 * Simple text diff for change history (fast & reliable)
 * Uses pdf-parse for simple text extraction and counting
 * @param originalPdfPath - Path to original PDF
 * @param modifiedPdfPath - Path to modified PDF
 * @returns Simple change counts for display
 */
export declare function calculateSimpleTextDiff(originalPdfPath: string, modifiedPdfPath: string): Promise<SimpleDiffResult>;
//# sourceMappingURL=pdf-diff-calculator.utils.d.ts.map