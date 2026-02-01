import path from 'path';
import fs from 'fs/promises';
/**
 * Get the uploads directory path
 * Works consistently across environments (dev, prod, Docker)
 */
export function getUploadsDir() {
    // Use environment variable if set, otherwise default to uploads
    const uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
    return uploadsDir;
}
/**
 * Resolve a relative path to absolute path from uploads directory
 * @param relativePath - Path relative to uploads directory (e.g., "visual-diffs/file.pdf")
 * @returns Absolute path
 */
export function resolveUploadPath(relativePath) {
    const uploadsDir = getUploadsDir();
    return path.join(uploadsDir, relativePath);
}
/**
 * Convert absolute path to relative path from uploads directory
 * @param absolutePath - Absolute file path
 * @returns Relative path from uploads directory
 */
export function getRelativeUploadPath(absolutePath) {
    const uploadsDir = getUploadsDir();
    return path.relative(uploadsDir, absolutePath);
}
/**
 * Generate a stable visual diff file path
 * @param articleId - Article ID
 * @param versionNumber - Version number (optional)
 * @returns Relative path from uploads directory
 */
export function generateVisualDiffPath(articleId, versionNumber) {
    const fileName = versionNumber
        ? `visual-diff-v${versionNumber}-${articleId}.pdf`
        : `visual-diff-${articleId}.pdf`;
    return `visual-diffs/${fileName}`;
}
/**
 * Ensure directory exists
 * @param dirPath - Directory path to create
 */
export async function ensureDirectoryExists(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    }
    catch (error) {
        // Ignore error if directory already exists
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}
/**
 * Check if file exists and is readable
 * @param filePath - File path to check
 * @returns True if file exists and is readable
 */
export async function fileExists(filePath) {
    try {
        const stats = await fs.stat(filePath);
        return stats.isFile() && stats.size > 0;
    }
    catch {
        return false;
    }
}
/**
 * Validate file exists and has content
 * @param filePath - File path to validate
 * @throws Error if file is missing, empty, or unreadable
 */
export async function validateFile(filePath) {
    try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
            throw new Error(`Path is not a file: ${filePath}`);
        }
        if (stats.size === 0) {
            throw new Error(`File is empty: ${filePath}`);
        }
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`File not found: ${filePath}`);
        }
        throw error;
    }
}
//# sourceMappingURL=file-path.utils.js.map