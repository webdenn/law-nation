/**
 * Overlay-based diff calculator - No PDF generation, just highlight coordinates
 * Replaces PDF.js complex coordinate system with simple text comparison + overlay data
 */
/**
 * Highlight coordinate data for frontend overlay
 */
export interface HighlightData {
    type: 'added' | 'removed' | 'modified';
    text: string;
    page: number;
    searchText: string;
    color: string;
    opacity: number;
}
/**
 * Overlay diff result - no coordinates, just search-based highlighting
 */
export interface OverlayDiffResult {
    highlights: HighlightData[];
    summary: {
        addedCount: number;
        removedCount: number;
        modifiedCount: number;
        totalChanges: number;
    };
    editedPdfPath: string;
}
/**
 * Calculate diff for overlay highlighting (no PDF generation)
 * @param originalPdfPath - Path to original PDF
 * @param editedPdfPath - Path to edited PDF
 * @returns Overlay data for frontend highlighting
 */
export declare function calculateOverlayDiff(originalPdfPath: string, editedPdfPath: string): Promise<OverlayDiffResult>;
/**
 * Generate simple highlight data for frontend (fallback method)
 * @param editedPdfPath - Path to edited PDF
 * @returns Basic highlight data for testing
 */
export declare function generateTestHighlights(editedPdfPath: string): Promise<OverlayDiffResult>;
//# sourceMappingURL=overlay-diff-calculator.utils.d.ts.map