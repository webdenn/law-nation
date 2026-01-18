/**
 * Overlay Visual Diff Generator - No PDF generation, just overlay data
 * Returns existing edited PDF + highlight data for frontend overlay
 */
/**
 * Visual diff response for frontend
 */
export interface VisualDiffResponse {
    success: boolean;
    pdfPath: string;
    highlightData: any;
    summary: {
        addedCount: number;
        removedCount: number;
        modifiedCount: number;
        totalChanges: number;
    };
    message: string;
}
/**
 * Generate visual diff using overlay approach (no PDF generation)
 * @param originalPdfPath - Path to original PDF
 * @param editedPdfPath - Path to edited PDF
 * @returns Visual diff response with overlay data
 */
export declare function generateOverlayVisualDiff(originalPdfPath: string, editedPdfPath: string): Promise<VisualDiffResponse>;
/**
 * Generate visual diff from change log (overlay approach)
 * @param changeLogId - Change log ID
 * @param articleId - Article ID
 * @param versionNumber - Version number
 * @param originalPdfPath - Path to original PDF
 * @param editedPdfPath - Path to edited PDF
 * @returns Visual diff response with overlay data
 */
export declare function generateOverlayVisualDiffFromChangeLog(changeLogId: string, articleId: string, versionNumber: number, originalPdfPath: string, editedPdfPath: string): Promise<VisualDiffResponse>;
/**
 * Test overlay visual diff with debug data
 * @param editedPdfPath - Path to edited PDF
 * @returns Test visual diff response
 */
export declare function generateTestOverlayVisualDiff(editedPdfPath: string): Promise<VisualDiffResponse>;
//# sourceMappingURL=overlay-visual-diff.utils.d.ts.map