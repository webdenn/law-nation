/**
 * Add watermark to Word document (simple version - returns original for now)
 */
export declare function addWatermarkToWord(wordPath: string, watermarkData: {
    userName: string;
    downloadDate: Date;
    articleTitle: string;
    articleId: string;
    frontendUrl: string;
}): Promise<Buffer>;
/**
 * Add simple text watermark to Word document
 * This creates a new document with watermark header and original content
 * Note: This is a simplified version. For production, use docx-templates
 */
export declare function addSimpleWatermarkToWord(wordPath: string, watermarkData: {
    userName: string;
    downloadDate: Date;
    articleTitle: string;
    articleId: string;
    frontendUrl: string;
}): Promise<Buffer>;
//# sourceMappingURL=word-watermark.utils.d.ts.map