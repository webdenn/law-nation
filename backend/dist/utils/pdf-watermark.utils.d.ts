/**
 * Add watermark to PDF with clickable link
 * @param pdfPath - Path to PDF file (local or URL)
 * @param options - Watermark options
 * @returns Watermarked PDF as Buffer
 */
export declare function addWatermarkToPdf(pdfPath: string, options: {
    userName?: string;
    downloadDate: Date;
    articleTitle?: string;
    articleId: string;
    frontendUrl: string;
}): Promise<Buffer>;
//# sourceMappingURL=pdf-watermark.utils.d.ts.map