import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

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
 * Extract text from PDF file
 */
async function extractTextFromPdf(filePath: string): Promise<string> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await PDFParse(dataBuffer);
    return data.text || "";
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

/**
 * Extract text from Word file
 */
async function extractTextFromWord(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error("Error extracting text from Word:", error);
    throw new Error("Failed to extract text from Word");
  }
}

/**
 * Extract text from file based on type
 */
async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === ".pdf") {
    return await extractTextFromPdf(filePath);
  } else if (ext === ".docx" || ext === ".doc") {
    return await extractTextFromWord(filePath);
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Normalize text by removing extra whitespace and normalizing line breaks
 */
function normalizeText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0); // Remove empty lines
}

/**
 * Simple diff algorithm (line-by-line comparison)
 */
function calculateLineDiff(oldLines: string[], newLines: string[]): DiffResult {
  const added: DiffLine[] = [];
  const removed: DiffLine[] = [];
  const modified: DiffLine[] = [];
  const unchanged: DiffLine[] = [];

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
    if (!removedContent) continue;
    
    for (let j = addedContents.length - 1; j >= 0; j--) {
      const addedContent = addedContents[j];
      if (!addedContent) continue;
      
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
function calculateSimilarity(str1: string, str2: string): number {
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
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str2.length; i++) {
    matrix[i]![0] = i;
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1,     // insertion
          matrix[i - 1]![j]! + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length]![str1.length]!;
}

/**
 * Main function: Calculate diff between two files
 */
export async function calculateFileDiff(
  oldFilePath: string,
  newFilePath: string
): Promise<DiffResult> {
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
  } catch (error) {
    console.error("❌ [Diff] Error calculating diff:", error);
    throw error;
  }
}

/**
 * Generate human-readable diff summary
 */
export function generateDiffSummary(diff: DiffResult): string {
  const { summary } = diff;
  
  const parts: string[] = [];
  
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
export function getFileTypeFromPath(filePath: string): "PDF" | "WORD" {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".pdf" ? "PDF" : "WORD";
}
