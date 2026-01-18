/**
 * Download file from URL to buffer
 * @param url - URL to download from
 * @returns Buffer containing file data
 */
export declare function downloadFileToBuffer(url: string): Promise<Buffer>;
export declare function extractPdfText(pdfPath: string): Promise<string>;
export declare function convertTextToHtml(text: string): string;
/**
 * Extract images from PDF and save them to disk
 * @param pdfPath - Path to PDF file (local or URL)
 * @param articleId - Article ID for unique filenames
 * @returns Array of image URLs
 */
export declare function extractPdfImages(pdfPath: string, articleId: string): Promise<string[]>;
/**
 * Extract both text and images from PDF
 * @param pdfPath - Path to PDF file (local or URL)
 * @param articleId - Article ID for unique image filenames (optional)
 * @returns Object containing text, html, and image URLs
 */
export declare function extractPdfContent(pdfPath: string, articleId?: string): Promise<{
    text: string;
    html: string;
    images: string[];
}>;
//# sourceMappingURL=pdf-extract.utils.d.ts.map