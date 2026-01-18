/**
 * API utilities for overlay visual diff
 * Provides endpoints for frontend to get highlight data
 */
/**
 * API response for visual diff overlay data
 */
export interface OverlayApiResponse {
    success: boolean;
    data?: {
        pdfUrl: string;
        highlights: any[];
        summary: {
            addedCount: number;
            removedCount: number;
            modifiedCount: number;
            totalChanges: number;
        };
        metadata: {
            timestamp: string;
            approach: string;
            version: string;
        };
    };
    error?: {
        message: string;
        code: string;
        details?: any;
    };
}
/**
 * Generate overlay data for API response
 * @param originalPdfPath - Path to original PDF
 * @param editedPdfPath - Path to edited PDF
 * @param baseUrl - Base URL for PDF access
 * @returns API response with overlay data
 */
export declare function generateOverlayApiResponse(originalPdfPath: string, editedPdfPath: string, baseUrl?: string): Promise<OverlayApiResponse>;
/**
 * Create test overlay API response for debugging
 * @param editedPdfPath - Path to edited PDF
 * @param baseUrl - Base URL for PDF access
 * @returns Test API response
 */
export declare function generateTestOverlayApiResponse(editedPdfPath: string, baseUrl?: string): Promise<OverlayApiResponse>;
//# sourceMappingURL=overlay-api.utils.d.ts.map