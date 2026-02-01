/**
 * Convert Word document to PDF
 * Handles both local paths and remote URLs (Supabase)
 */
export declare function convertWordToPdf(wordFilePath: string): Promise<string>;
/**
 * Convert PDF to Word document
 * Handles both local paths and remote URLs (Supabase)
 * Note: This is a basic conversion that extracts text and creates a simple Word doc
 */
export declare function convertPdfToWord(pdfFilePath: string): Promise<string>;
/**
 * Detect file type from extension
 */
export declare function getFileType(filePath: string): 'pdf' | 'docx' | 'unknown';
/**
 * Ensure both PDF and Word versions exist
 * Converts the file if the other format doesn't exist
 */
export declare function ensureBothFormats(filePath: string): Promise<{
    pdfPath: string;
    wordPath: string;
}>;
//# sourceMappingURL=file-conversion.utils.d.ts.map