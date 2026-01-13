import * as pdfjsLib from 'pdfjs-dist';
import fs from 'fs';
import path from 'path';

// ✅ CORRECT: Configure real worker for PDF.js v5.4.530
const workerPath = path.join(
  process.cwd(),
  "node_modules",
  "pdfjs-dist",
  "build",
  "pdf.worker.mjs"
);

if (!fs.existsSync(workerPath)) {
  throw new Error("❌ pdf.worker.mjs not found at: " + workerPath);
}

pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
console.log("✅ PDF.js worker configured:", workerPath);
console.log("✅ PDF.js version:", pdfjsLib.version);

/**
 * Text item position information (PDF.js v5.4.530 compatible)
 */
export interface WordPosition {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Page text with positions (atomic text items)
 */
export interface PageText {
  pageNumber: number;
  words: WordPosition[]; // Note: These are text items, not individual words
  width: number;
  height: number;
}

/**
 * Extract text with positions from PDF
 * @param pdfPath - Path to PDF file
 * @returns Array of pages with word positions
 */
export async function extractTextWithPositions(pdfPath: string): Promise<PageText[]> {
  console.log(`📄 [Text Extract] Extracting text from: ${pdfPath}`);
  
  try {
    // Read PDF file
    let fullPath = pdfPath;
    if (pdfPath.startsWith('/uploads')) {
      fullPath = path.join(process.cwd(), pdfPath);
    }
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`PDF file not found: ${fullPath}`);
    }
    
    const pdfBuffer = fs.readFileSync(fullPath);
    
    // ✅ CORRECT: v5.4.530 compatible PDF loading
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
    });
    
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    
    console.log(`📄 [Text Extract] PDF has ${numPages} pages`);
    
    const pagesText: PageText[] = [];
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1 }); // ✅ CORRECT: Use scale 1 for accuracy
      const textContent = await page.getTextContent();
      
      const words: WordPosition[] = [];
      
      // Process each text item
      for (const item of textContent.items) {
        if ('str' in item && item.str.trim()) {
          // ✅ CORRECT: v5.4.530 coordinate conversion
          const [x, y] = viewport.convertToViewportPoint(
            item.transform[4],
            item.transform[5]
          );
          
          // ✅ CORRECT: v5.4.530 height calculation from transform matrix
          const [a, b, c, d] = item.transform;
          const fontHeight = Math.sqrt(b * b + d * d);
          const itemHeight = fontHeight * viewport.scale;
          const itemWidth = item.width * viewport.scale;
          
          // ✅ CORRECT: Treat each text item as atomic (no word splitting)
          const text = item.str.trim();
          if (text) {
            words.push({
              text,
              x: Math.round(x),
              y: Math.round(y - itemHeight), // ✅ FIX: Convert baseline to top-left
              width: Math.round(itemWidth),
              height: Math.round(itemHeight),
            });
          }
        }
      }
      
      // ✅ IMPROVED: Sort words by reading order (top to bottom, left to right)
      words.sort((a, b) => {
        const yDiff = Math.abs(a.y - b.y);
        if (yDiff > 5) { // Different lines
          return a.y - b.y; // Top to bottom
        }
        return a.x - b.x; // Left to right on same line
      });
      
      pagesText.push({
        pageNumber: pageNum,
        words,
        width: viewport.width,
        height: viewport.height,
      });
      
      console.log(`✅ [Text Extract] Page ${pageNum}: ${words.length} text items extracted`);
    }
    
    console.log(`✅ [Text Extract] Extraction complete: ${pagesText.length} pages`);
    return pagesText;
    
  } catch (error) {
    console.error('❌ [Text Extract] Failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error}`);
  }
}

/**
 * Extract plain text from PDF (without positions)
 * @param pdfPath - Path to PDF file
 * @returns Plain text content
 */
export async function extractPlainText(pdfPath: string): Promise<string> {
  const pagesText = await extractTextWithPositions(pdfPath);
  
  let plainText = '';
  for (const page of pagesText) {
    // Join text items with spaces (they're already atomic text units)
    const pageText = page.words.map(item => item.text).join(' ');
    plainText += pageText + '\n\n';
  }
  
  return plainText.trim();
}
