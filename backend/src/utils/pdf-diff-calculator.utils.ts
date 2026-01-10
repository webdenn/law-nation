import { diffWords, diffLines } from 'diff';
import type { Change } from 'diff';
import { extractTextWithPositions } from './pdf-text-extract.utils.js';
import type { PageText, WordPosition } from './pdf-text-extract.utils.js';

/**
 * Change type
 */
export type ChangeType = 'added' | 'deleted' | 'unchanged';

/**
 * Text change with position
 */
export interface TextChange {
  type: ChangeType;
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Diff result
 */
export interface DiffResult {
  changes: TextChange[];
  addedCount: number;
  deletedCount: number;
  unchangedCount: number;
}

/**
 * Calculate differences between two PDFs
 * @param originalPdfPath - Path to original PDF
 * @param modifiedPdfPath - Path to modified PDF
 * @returns Diff result with changes and positions
 */
export async function calculatePdfDifferences(
  originalPdfPath: string,
  modifiedPdfPath: string
): Promise<DiffResult> {
  console.log('\n🔍 [Diff Calculator] Starting PDF comparison...');
  console.log(`📄 [Diff Calculator] Original: ${originalPdfPath}`);
  console.log(`📄 [Diff Calculator] Modified: ${modifiedPdfPath}`);
  
  try {
    // Extract text with positions from both PDFs
    const originalPages = await extractTextWithPositions(originalPdfPath);
    const modifiedPages = await extractTextWithPositions(modifiedPdfPath);
    
    // Convert to plain text for comparison
    const originalText = pagesToText(originalPages);
    const modifiedText = pagesToText(modifiedPages);
    
    console.log(`📊 [Diff Calculator] Original text length: ${originalText.length} chars`);
    console.log(`📊 [Diff Calculator] Modified text length: ${modifiedText.length} chars`);
    
    // Calculate word-level differences
    const diffResult = diffWords(originalText, modifiedText);
    
    console.log(`📊 [Diff Calculator] Diff parts: ${diffResult.length}`);
    
    // Map differences to positions
    const changes: TextChange[] = [];
    let addedCount = 0;
    let deletedCount = 0;
    let unchangedCount = 0;
    
    let originalIndex = 0;
    let modifiedIndex = 0;
    
    for (const part of diffResult) {
      const words = part.value.trim().split(/\s+/).filter(w => w);
      
      if (part.added) {
        // Text was added
        for (const word of words) {
          const position = findWordPosition(modifiedPages, word, modifiedIndex);
          if (position) {
            changes.push({
              type: 'added',
              text: word,
              page: position.page,
              x: position.x,
              y: position.y,
              width: position.width,
              height: position.height,
            });
            addedCount++;
          }
          modifiedIndex++;
        }
      } else if (part.removed) {
        // Text was deleted
        for (const word of words) {
          const position = findWordPosition(originalPages, word, originalIndex);
          if (position) {
            changes.push({
              type: 'deleted',
              text: word,
              page: position.page,
              x: position.x,
              y: position.y,
              width: position.width,
              height: position.height,
            });
            deletedCount++;
          }
          originalIndex++;
        }
      } else {
        // Text unchanged
        unchangedCount += words.length;
        originalIndex += words.length;
        modifiedIndex += words.length;
      }
    }
    
    console.log(`✅ [Diff Calculator] Comparison complete:`);
    console.log(`   ➕ Added: ${addedCount} words`);
    console.log(`   ➖ Deleted: ${deletedCount} words`);
    console.log(`   ⚪ Unchanged: ${unchangedCount} words`);
    console.log(`   📝 Total changes: ${changes.length}`);
    
    return {
      changes,
      addedCount,
      deletedCount,
      unchangedCount,
    };
    
  } catch (error) {
    console.error('❌ [Diff Calculator] Failed:', error);
    throw new Error(`Failed to calculate PDF differences: ${error}`);
  }
}

/**
 * Convert pages to plain text
 */
function pagesToText(pages: PageText[]): string {
  let text = '';
  for (const page of pages) {
    const pageText = page.words.map(w => w.text).join(' ');
    text += pageText + ' ';
  }
  return text.trim();
}

/**
 * Find word position in pages
 */
function findWordPosition(
  pages: PageText[],
  word: string,
  wordIndex: number
): { page: number; x: number; y: number; width: number; height: number } | null {
  let currentIndex = 0;
  
  for (const page of pages) {
    for (const wordPos of page.words) {
      if (currentIndex === wordIndex && wordPos.text === word) {
        return {
          page: page.pageNumber,
          x: wordPos.x,
          y: wordPos.y,
          width: wordPos.width,
          height: wordPos.height,
        };
      }
      currentIndex++;
    }
  }
  
  // If exact match not found, try to find similar word
  currentIndex = 0;
  for (const page of pages) {
    for (const wordPos of page.words) {
      if (currentIndex === wordIndex) {
        return {
          page: page.pageNumber,
          x: wordPos.x,
          y: wordPos.y,
          width: wordPos.width,
          height: wordPos.height,
        };
      }
      currentIndex++;
    }
  }
  
  return null;
}
