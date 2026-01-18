import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import { extractPdfText } from "./pdf-extract.utils.js";
/**
 * Extract text from PDF file using the reliable pdf-parse extractor
 */
async function extractTextFromPdf(filePath) {
    try {
        console.log(`📄 [Diff-PDF] Extracting text from: ${filePath}`);
        // Use the reliable pdf-extract utility
        const text = await extractPdfText(filePath);
        console.log(`✅ [Diff-PDF] Extracted ${text.length} characters`);
        if (text.trim().length === 0) {
            console.warn(`⚠️ [Diff-PDF] WARNING: No text extracted from PDF`);
            console.warn(`   This might mean:`);
            console.warn(`   - PDF is scanned (image-based)`);
            console.warn(`   - PDF is encrypted/protected`);
            console.warn(`   - PDF is corrupted`);
        }
        return text;
    }
    catch (error) {
        console.error("❌ [Diff-PDF] Error extracting text from PDF:", error);
        console.error("❌ [Diff-PDF] File path:", filePath);
        console.error("❌ [Diff-PDF] Error details:", error instanceof Error ? error.message : String(error));
        throw new Error("Failed to extract text from PDF");
    }
}
/**
 * Extract text from Word file
 */
async function extractTextFromWord(filePath) {
    try {
        console.log(`📄 [Diff-Word] Extracting text from: ${filePath}`);
        let absolutePath = filePath;
        // Handle URLs (download first)
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            console.log(`🌐 [Diff-Word] Downloading from URL...`);
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to download Word file: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            // Save to temp file for mammoth
            const tempPath = path.join(process.cwd(), 'uploads', 'temp', `temp-${Date.now()}.docx`);
            await fs.writeFile(tempPath, buffer);
            absolutePath = tempPath;
            console.log(`✅ [Diff-Word] Downloaded to temp: ${tempPath}`);
        }
        else {
            // Convert relative path to absolute
            if (filePath.startsWith('/uploads')) {
                absolutePath = path.join(process.cwd(), filePath);
                console.log(`🔄 [Diff-Word] Converted to absolute path: ${absolutePath}`);
            }
        }
        console.log(`📖 [Diff-Word] Extracting text with mammoth...`);
        const result = await mammoth.extractRawText({ path: absolutePath });
        const text = result.value;
        console.log(`✅ [Diff-Word] Extracted ${text.length} characters`);
        // Clean up temp file if it was downloaded
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            try {
                await fs.unlink(absolutePath);
                console.log(`🧹 [Diff-Word] Cleaned up temp file`);
            }
            catch (e) {
                console.warn(`⚠️ [Diff-Word] Could not delete temp file: ${absolutePath}`);
            }
        }
        return text;
    }
    catch (error) {
        console.error("❌ [Diff-Word] Error extracting text from Word:", error);
        console.error("❌ [Diff-Word] File path:", filePath);
        console.error("❌ [Diff-Word] Error details:", error instanceof Error ? error.message : String(error));
        throw new Error("Failed to extract text from Word");
    }
}
/**
 * Extract text from file based on type
 */
async function extractTextFromFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".pdf") {
        return await extractTextFromPdf(filePath);
    }
    else if (ext === ".docx" || ext === ".doc") {
        return await extractTextFromWord(filePath);
    }
    else {
        throw new Error(`Unsupported file type: ${ext}`);
    }
}
/**
 * Normalize text by removing extra whitespace and normalizing line breaks
 */
function normalizeText(text) {
    return text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0); // Remove empty lines
}
/**
 * Simple diff algorithm (line-by-line comparison)
 */
function calculateLineDiff(oldLines, newLines) {
    const added = [];
    const removed = [];
    const modified = [];
    const unchanged = [];
    const oldSet = new Set(oldLines);
    const newSet = new Set(newLines);
    // Find removed lines (in old but not in new)
    oldLines.forEach((line, index) => {
        if (!newSet.has(line)) {
            removed.push({
                lineNumber: index + 1,
                content: line,
                type: "removed",
                oldLineNumber: index + 1,
            });
        }
    });
    // Find added lines (in new but not in old)
    newLines.forEach((line, index) => {
        if (!oldSet.has(line)) {
            added.push({
                lineNumber: index + 1,
                content: line,
                type: "added",
                newLineNumber: index + 1,
            });
        }
    });
    // Find unchanged lines
    newLines.forEach((line, index) => {
        if (oldSet.has(line)) {
            unchanged.push({
                lineNumber: index + 1,
                content: line,
                type: "unchanged",
                newLineNumber: index + 1,
            });
        }
    });
    // Detect modified lines (similar but not exact match)
    const removedContents = removed.map(r => r.content);
    const addedContents = added.map(a => a.content);
    for (let i = removedContents.length - 1; i >= 0; i--) {
        const removedContent = removedContents[i];
        if (!removedContent)
            continue;
        for (let j = addedContents.length - 1; j >= 0; j--) {
            const addedContent = addedContents[j];
            if (!addedContent)
                continue;
            const similarity = calculateSimilarity(removedContent, addedContent);
            // If similarity > 50%, consider it a modification
            if (similarity > 0.5) {
                const removedLine = removed[i];
                const addedLine = added[j];
                if (removedLine && addedLine) {
                    modified.push({
                        lineNumber: addedLine.lineNumber,
                        content: addedLine.content,
                        type: "modified",
                        oldLineNumber: removedLine.lineNumber,
                        newLineNumber: addedLine.lineNumber,
                    });
                    // Remove from added and removed arrays
                    removed.splice(i, 1);
                    added.splice(j, 1);
                    removedContents.splice(i, 1);
                    addedContents.splice(j, 1);
                }
                break;
            }
        }
    }
    return {
        added,
        removed,
        modified,
        unchanged,
        summary: {
            totalAdded: added.length,
            totalRemoved: removed.length,
            totalModified: modified.length,
            totalUnchanged: unchanged.length,
        },
    };
}
/**
 * Calculate similarity between two strings (0 to 1)
 */
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) {
        return 1.0;
    }
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}
/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1)
        .fill(null)
        .map(() => Array(str1.length + 1).fill(0));
    for (let i = 0; i <= str2.length; i++) {
        matrix[i][0] = i;
    }
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                matrix[i][j - 1] + 1, // insertion
                matrix[i - 1][j] + 1 // deletion
                );
            }
        }
    }
    return matrix[str2.length][str1.length];
}
/**
 * Main function: Calculate diff between two files
 */
export async function calculateFileDiff(oldFilePath, newFilePath) {
    try {
        console.log(`📊 [Diff] Calculating diff between files...`);
        console.log(`   Old: ${oldFilePath}`);
        console.log(`   New: ${newFilePath}`);
        // Extract text from both files
        const oldText = await extractTextFromFile(oldFilePath);
        const newText = await extractTextFromFile(newFilePath);
        console.log(`📄 [Diff] Extracted text - Old: ${oldText.length} chars, New: ${newText.length} chars`);
        // Normalize text into lines
        const oldLines = normalizeText(oldText);
        const newLines = normalizeText(newText);
        console.log(`📝 [Diff] Normalized lines - Old: ${oldLines.length} lines, New: ${newLines.length} lines`);
        // Calculate diff
        const diff = calculateLineDiff(oldLines, newLines);
        console.log(`✅ [Diff] Calculation complete:`);
        console.log(`   Added: ${diff.summary.totalAdded} lines`);
        console.log(`   Removed: ${diff.summary.totalRemoved} lines`);
        console.log(`   Modified: ${diff.summary.totalModified} lines`);
        console.log(`   Unchanged: ${diff.summary.totalUnchanged} lines`);
        return diff;
    }
    catch (error) {
        console.error("❌ [Diff] Error calculating diff:", error);
        throw error;
    }
}
/**
 * Generate human-readable diff summary
 */
export function generateDiffSummary(diff) {
    const { summary } = diff;
    const parts = [];
    if (summary.totalAdded > 0) {
        parts.push(`${summary.totalAdded} line${summary.totalAdded > 1 ? 's' : ''} added`);
    }
    if (summary.totalRemoved > 0) {
        parts.push(`${summary.totalRemoved} line${summary.totalRemoved > 1 ? 's' : ''} removed`);
    }
    if (summary.totalModified > 0) {
        parts.push(`${summary.totalModified} line${summary.totalModified > 1 ? 's' : ''} modified`);
    }
    if (parts.length === 0) {
        return "No changes detected";
    }
    return parts.join(", ");
}
/**
 * Get file type from file path
 */
export function getFileTypeFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return ext === ".pdf" ? "PDF" : "WORD";
}
//# sourceMappingURL=diff-calculator.utils.js.map