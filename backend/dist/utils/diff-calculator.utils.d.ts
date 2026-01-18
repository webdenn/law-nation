export interface DiffLine {
    lineNumber: number;
    content: string;
    type: "added" | "removed" | "unchanged" | "modified";
    oldLineNumber?: number;
    newLineNumber?: number;
}
export interface DiffResult {
    added: DiffLine[];
    removed: DiffLine[];
    modified: DiffLine[];
    unchanged: DiffLine[];
    summary: {
        totalAdded: number;
        totalRemoved: number;
        totalModified: number;
        totalUnchanged: number;
    };
}
/**
 * Main function: Calculate diff between two files
 */
export declare function calculateFileDiff(oldFilePath: string, newFilePath: string): Promise<DiffResult>;
/**
 * Generate human-readable diff summary
 */
export declare function generateDiffSummary(diff: DiffResult): string;
/**
 * Get file type from file path
 */
export declare function getFileTypeFromPath(filePath: string): "PDF" | "WORD";
//# sourceMappingURL=diff-calculator.utils.d.ts.map