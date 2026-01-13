import { diffWords } from 'diff';
import { extractTextWithPositions } from './pdf-text-extract.utils.js';
import { extractPdfText } from './pdf-extract.utils.js';
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
 * Simple diff result for change history (counts only)
 */
export interface SimpleDiffResult {
  addedCount: number;
  deletedCount: number;
  modifiedCount: number;
  totalChanges: number;
}

/**
 * Complex diff result for visual markup (with positions)
 */
export interface DiffResult {
  changes: TextChange[];
  addedCount: number;
  deletedCount: number;
  unchangedCount: number;
}

/**
 * SYSTEM 1: Simple text diff for change history (fast & reliable)
 * Uses pdf-parse for simple text extraction and counting
 * @param originalPdfPath - Path to original PDF
 * @param modifiedPdfPath - Path to modified PDF
 * @returns Simple change counts for display
 */
export async function calculateSimpleTextDiff(
  originalPdfPath: string,
  modifiedPdfPath: string
): Promise<SimpleDiffResult> {
  console.log('\n📊 [Simple Diff] Starting change history calculation...');
  console.log(`📄 [Simple Diff] Original: ${originalPdfPath}`);
  console.log(`📄 [Simple Diff] Modified: ${modifiedPdfPath}`);
  
  try {
    // Extract plain text using pdf-parse (simple & reliable)
    console.log('📖 [Simple Diff] Extracting text using pdf-parse...');
    const originalText = await extractPdfText(originalPdfPath);
    const modifiedText = await extractPdfText(modifiedPdfPath);
    
    console.log(`📊 [Simple Diff] Original text: ${originalText.length} chars`);
    console.log(`📊 [Simple Diff] Modified text: ${modifiedText.length} chars`);
    
    // Perform word-level diff
    const diffResult = diffWords(originalText, modifiedText);
    
    let addedCount = 0;
    let deletedCount = 0;
    let modifiedCount = 0;
    
    // Count changes
    for (const part of diffResult) {
      const wordCount = part.value.trim().split(/\s+/).filter(w => w.length > 0).length;
      
      if (part.added) {
        addedCount += wordCount;
      } else if (part.removed) {
        deletedCount += wordCount;
      }
    }
    
    // Calculate modified count (pairs of add/remove operations)
    modifiedCount = Math.min(addedCount, deletedCount);
    const actualAdded = addedCount - modifiedCount;
    const actualDeleted = deletedCount - modifiedCount;
    
    const result: SimpleDiffResult = {
      addedCount: actualAdded,
      deletedCount: actualDeleted,
      modifiedCount,
      totalChanges: actualAdded + actualDeleted + modifiedCount,
    };
    
    console.log(`✅ [Simple Diff] Change history calculated:`);
    console.log(`   ➕ Added: ${result.addedCount} words`);
    console.log(`   ➖ Deleted: ${result.deletedCount} words`);
    console.log(`   🔄 Modified: ${result.modifiedCount} words`);
    console.log(`   📝 Total changes: ${result.totalChanges} words`);
    
    return result;
    
  } catch (error) {
    console.error('❌ [Simple Diff] Failed:', error);
    throw new Error(`Failed to calculate simple text diff: ${error}`);
  }
}

/**
 * SYSTEM 2: Complex positional diff for visual markup (PDF.js based)
 * Uses PDF.js for coordinate-aware text extraction and positioning
 * @param originalPdfPath - Path to original PDF
 * @param modifiedPdfPath - Path to modified PDF
 * @returns Diff result with changes and positions for visual markup
 */
export async function calculatePdfDifferences(
  originalPdfPath: string,
  modifiedPdfPath: string
): Promise<DiffResult> {
  console.log('\n🎨 [Visual Diff] Starting PDF comparison for visual markup...');
  console.log(`📄 [Visual Diff] Original: ${originalPdfPath}`);
  console.log(`📄 [Visual Diff] Modified: ${modifiedPdfPath}`);
  
  try {
    // Extract text with positions from both PDFs using PDF.js
    console.log('🎯 [Visual Diff] Extracting positioned text using PDF.js...');
    const originalPages = await extractTextWithPositions(originalPdfPath);
    const modifiedPages = await extractTextWithPositions(modifiedPdfPath);
    
    // Convert to plain text for comparison
    const originalText = pagesToText(originalPages);
    const modifiedText = pagesToText(modifiedPages);
    
    console.log(`📊 [Visual Diff] Original text length: ${originalText.length} chars`);
    console.log(`📊 [Visual Diff] Modified text length: ${modifiedText.length} chars`);
    
    // ✅ IMPROVED: Use word-level diff for better accuracy
    const diffResult = diffWords(originalText, modifiedText);
    
    console.log(`📊 [Visual Diff] Diff parts: ${diffResult.length}`);
    
    // ✅ IMPROVED: Better change mapping with accurate positioning
    const changes: TextChange[] = [];
    let addedCount = 0;
    let deletedCount = 0;
    let unchangedCount = 0;
    
    // Create word arrays for better indexing
    const originalWords = getAllWords(originalPages);
    const modifiedWords = getAllWords(modifiedPages);
    
    let originalWordIndex = 0;
    let modifiedWordIndex = 0;
    
    for (const part of diffResult) {
      const partWords = part.value.trim().split(/\s+/).filter(w => w.length > 0);
      
      if (part.added) {
        // ✅ IMPROVED: Better position mapping for added words
        for (const word of partWords) {
          const position = findWordInArray(modifiedWords, word, modifiedWordIndex);
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
          modifiedWordIndex++;
        }
      } else if (part.removed) {
        // ✅ IMPROVED: Better position mapping for deleted words
        for (const word of partWords) {
          const position = findWordInArray(originalWords, word, originalWordIndex);
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
          originalWordIndex++;
        }
      } else {
        // Text unchanged - advance both indices
        unchangedCount += partWords.length;
        originalWordIndex += partWords.length;
        modifiedWordIndex += partWords.length;
      }
    }
    
    console.log(`✅ [Visual Diff] Comparison complete:`);
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
    console.error('❌ [Visual Diff] Failed:', error);
    throw new Error(`Failed to calculate PDF differences: ${error}`);
  }
}

/**
 * ✅ NEW: Get all words from all pages in a flat array with page info
 */
function getAllWords(pages: PageText[]): Array<WordPosition & { page: number }> {
  const allWords: Array<WordPosition & { page: number }> = [];
  
  for (const page of pages) {
    for (const word of page.words) {
      allWords.push({
        ...word,
        page: page.pageNumber,
      });
    }
  }
  
  return allWords;
}

/**
 * ✅ IMPROVED: Better word finding with fuzzy matching
 */
function findWordInArray(
  words: Array<WordPosition & { page: number }>,
  targetWord: string,
  startIndex: number
): { page: number; x: number; y: number; width: number; height: number } | null {
  // Try exact match first
  if (startIndex < words.length) {
    const word = words[startIndex];
    if (word && word.text === targetWord) {
      return {
        page: word.page,
        x: word.x,
        y: word.y,
        width: word.width,
        height: word.height,
      };
    }
  }
  
  // Try nearby words (within 5 positions)
  const searchRange = 5;
  const start = Math.max(0, startIndex - searchRange);
  const end = Math.min(words.length, startIndex + searchRange);
  
  for (let i = start; i < end; i++) {
    const word = words[i];
    if (word && word.text === targetWord) {
      return {
        page: word.page,
        x: word.x,
        y: word.y,
        width: word.width,
        height: word.height,
      };
    }
  }
  
  // Fallback: use position at startIndex even if text doesn't match
  if (startIndex < words.length) {
    const word = words[startIndex];
    if (word) {
      return {
        page: word.page,
        x: word.x,
        y: word.y,
        width: Math.max(word.width, targetWord.length * 8), // Estimate width
        height: word.height,
      };
    }
  }
  
  return null;
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

