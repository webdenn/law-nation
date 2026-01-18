export declare class AdobeService {
    private pdfServices;
    private isAvailable;
    constructor();
    private checkAvailability;
    /**
     * Convert PDF to DOCX using Adobe Services
     */
    convertPdfToDocx(pdfPath: string, outputPath: string): Promise<string>;
    /**
     * Convert DOCX to PDF using Adobe Services
     */
    convertDocxToPdf(docxPath: string, outputPath: string): Promise<string>;
    /**
     * Extract text from DOCX using Adobe Services
     */
    extractTextFromDocx(docxPath: string): Promise<string>;
    /**
     * Add watermark to DOCX (using existing utility as Adobe doesn't have direct watermark API)
     */
    addWatermarkToDocx(docxPath: string, outputPath: string, watermarkData: any): Promise<string>;
    /**
     * Test Adobe Services connectivity and credentials
     */
    testConnection(): Promise<{
        success: boolean;
        message: string;
        details?: any;
    }>;
}
export declare const adobeService: AdobeService;
//# sourceMappingURL=adobe.service.d.ts.map