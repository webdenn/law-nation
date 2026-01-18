import type { DiffResult } from './diff-calculator.utils.js';
interface DiffWordOptions {
    articleTitle: string;
    versionFrom: number;
    versionTo: number;
    editorName?: string;
    generatedBy: string;
}
/**
 * Generate a Word document showing the diff with tracked changes
 */
export declare function generateDiffWord(diffData: DiffResult, options: DiffWordOptions): Promise<Buffer>;
/**
 * Generate a simple Word document with plain text diff
 */
export declare function generateSimpleDiffWord(diffData: DiffResult): Promise<Buffer>;
export {};
//# sourceMappingURL=diff-word-generator.utils.d.ts.map