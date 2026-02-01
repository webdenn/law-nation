import type { DiffResult } from './diff-calculator.utils.js';
interface DiffPdfOptions {
    articleTitle: string;
    versionFrom: number;
    versionTo: number;
    editorName?: string;
    generatedBy: string;
}
export declare function generateDiffPdf(diffData: DiffResult, options: DiffPdfOptions): Promise<Buffer>;
/**
 * Generate a simple text-based diff (fallback)
 */
export declare function generateDiffText(diffData: DiffResult): string;
export {};
//# sourceMappingURL=diff-pdf-generator.utils.d.ts.map