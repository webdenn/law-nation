/**
 * Get the uploads directory path
 * Works consistently across environments (dev, prod, Docker)
 */
export declare function getUploadsDir(): string;
/**
 * Resolve a relative path to absolute path from uploads directory
 * @param relativePath - Path relative to uploads directory (e.g., "visual-diffs/file.pdf")
 * @returns Absolute path
 */
export declare function resolveUploadPath(relativePath: string): string;
/**
 * Convert absolute path to relative path from uploads directory
 * @param absolutePath - Absolute file path
 * @returns Relative path from uploads directory
 */
export declare function getRelativeUploadPath(absolutePath: string): string;
/**
 * Generate a stable visual diff file path
 * @param articleId - Article ID
 * @param versionNumber - Version number (optional)
 * @returns Relative path from uploads directory
 */
export declare function generateVisualDiffPath(articleId: string, versionNumber?: number): string;
/**
 * Ensure directory exists
 * @param dirPath - Directory path to create
 */
export declare function ensureDirectoryExists(dirPath: string): Promise<void>;
/**
 * Check if file exists and is readable
 * @param filePath - File path to check
 * @returns True if file exists and is readable
 */
export declare function fileExists(filePath: string): Promise<boolean>;
/**
 * Validate file exists and has content
 * @param filePath - File path to validate
 * @throws Error if file is missing, empty, or unreadable
 */
export declare function validateFile(filePath: string): Promise<void>;
//# sourceMappingURL=file-path.utils.d.ts.map