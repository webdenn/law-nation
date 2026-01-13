// import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
// import fs from 'fs';
// import path from 'path';

// /**
//  * Word position information
//  */
// export interface WordPosition {
//   text: string;
//   x: number;
//   y: number;
//   width: number;
//   height: number;
// }

// /**
//  * Page text with positions
//  */
// export interface PageText {
//   pageNumber: number;
//   words: WordPosition[];
//   width: number;
//   height: number;
// }

// /**
//  * Extract text with positions from PDF
//  * @param pdfPath - Path to PDF file
//  * @returns Array of pages with word positions
//  */
// export async function extractTextWithPositions(pdfPath: string): Promise<PageText[]> {
//   console.log(`📄 [Text Extract] Extracting text from: ${pdfPath}`);
  
//   try {
//     // Read PDF file
//     let fullPath = pdfPath;
//     if (pdfPath.startsWith('/uploads')) {
//       fullPath = path.join(process.cwd(), pdfPath);
//     }
    
//     if (!fs.existsSync(fullPath)) {
//       throw new Error(`PDF file not found: ${fullPath}`);
//     }
    
//     const pdfBuffer = fs.readFileSync(fullPath);
    
//     // Load PDF document
//     const loadingTask = pdfjsLib.getDocument({
//       data: new Uint8Array(pdfBuffer),
//       useSystemFonts: true,
//     });
    
//     const pdfDoc = await loadingTask.promise;
//     const numPages = pdfDoc.numPages;
    
//     console.log(`📄 [Text Extract] PDF has ${numPages} pages`);
    
//     const pagesText: PageText[] = [];
    
//     // Extract text from each page
//     for (let pageNum = 1; pageNum <= numPages; pageNum++) {
//       const page = await pdfDoc.getPage(pageNum);
//       const viewport = page.getViewport({ scale: 1.5 }); // Increased scale for better precision
//       const textContent = await page.getTextContent();
      
//       const words: WordPosition[] = [];
      
//       // Process each text item
//       for (const item of textContent.items) {
//         if ('str' in item && item.str.trim()) {
//           // ✅ IMPROVED: Better coordinate conversion with proper scaling
//           const [x, y] = viewport.convertToViewportPoint(
//             item.transform[4],
//             item.transform[5]
//           );
          
//           // ✅ IMPROVED: More accurate width and height calculation
//           const itemWidth = item.width * viewport.scale;
//           const itemHeight = item.height * viewport.scale;
          
//           // ✅ IMPROVED: Better word splitting with accurate positioning
//           const text = item.str.trim();
//           const words_in_item = text.split(/(\s+)/); // Keep spaces for accurate positioning
//           let cursorX = x;
          
//           for (const word_part of words_in_item) {
//             if (word_part.trim()) { // Only process non-space parts
//               // Calculate more accurate width based on character count
//               const charRatio = word_part.length / text.length;
//               const wordWidth = itemWidth * charRatio;
              
//               words.push({
//                 text: word_part.trim(),
//                 x: Math.round(cursorX),
//                 y: Math.round(y),
//                 width: Math.round(wordWidth),
//                 height: Math.round(itemHeight),
//               });
//             }
            
//             // Move cursor by the proportional width of this part (including spaces)
//             const partRatio = word_part.length / text.length;
//             cursorX += itemWidth * partRatio;
//           }
//         }
//       }
      
//       // ✅ IMPROVED: Sort words by reading order (top to bottom, left to right)
//       words.sort((a, b) => {
//         const yDiff = Math.abs(a.y - b.y);
//         if (yDiff > 5) { // Different lines
//           return a.y - b.y; // Top to bottom
//         }
//         return a.x - b.x; // Left to right on same line
//       });
      
//       pagesText.push({
//         pageNumber: pageNum,
//         words,
//         width: viewport.width,
//         height: viewport.height,
//       });
      
//       console.log(`✅ [Text Extract] Page ${pageNum}: ${words.length} words extracted`);
//     }
    
//     console.log(`✅ [Text Extract] Extraction complete: ${pagesText.length} pages`);
//     return pagesText;
    
//   } catch (error) {
//     console.error('❌ [Text Extract] Failed:', error);
//     throw new Error(`Failed to extract text from PDF: ${error}`);
//   }
// }

// /**
//  * Extract plain text from PDF (without positions)
//  * @param pdfPath - Path to PDF file
//  * @returns Plain text content
//  */
// export async function extractPlainText(pdfPath: string): Promise<string> {
//   const pagesText = await extractTextWithPositions(pdfPath);
  
//   let plainText = '';
//   for (const page of pagesText) {
//     const pageText = page.words.map(w => w.text).join(' ');
//     plainText += pageText + '\n\n';
//   }
  
//   return plainText.trim();
// }


// ✅ Fixes TypeScript "any" type error for the worker module
// @ts-ignore
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs';

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Word position information
 */
export interface WordPosition {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Page text with positions
 */
export interface PageText {
  pageNumber: number;
  words: WordPosition[];
  width: number;
  height: number;
}

/**
 * Extract text with positions from PDF
 */
export async function extractTextWithPositions(pdfPath: string): Promise<PageText[]> {
  console.log(`📄 [Text Extract] Extracting text from: ${pdfPath}`);
  
  try {
    // ✅ Windows/Node.js ESM Fix: Path ko file:// URL mein convert karein taaki worker load ho sake
    const workerPath = path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();

    // Read PDF file
    let fullPath = pdfPath;
    if (pdfPath.startsWith('/uploads')) {
      fullPath = path.join(process.cwd(), pdfPath);
    }
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`PDF file not found: ${fullPath}`);
    }
    
    const pdfBuffer = fs.readFileSync(fullPath);
    const data = new Uint8Array(pdfBuffer);
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: data,
      useSystemFonts: true,
      stopAtErrors: true // Version mismatch ya worker crash hone par turant error dega
    });
    
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    
    console.log(`📄 [Text Extract] PDF has ${numPages} pages`);
    
    const pagesText: PageText[] = [];
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const textContent = await page.getTextContent();
      
      const words: WordPosition[] = [];
      
      // Process each text item
      for (const item of textContent.items) {
        // @ts-ignore - 'str' exists in TextItem but TS sometimes complains
        if ('str' in item && item.str.trim()) {
          const [x, y] = viewport.convertToViewportPoint(
            // @ts-ignore
            item.transform[4],
            // @ts-ignore
            item.transform[5]
          );
          
          // @ts-ignore
          const itemWidth = item.width * viewport.scale;
          // @ts-ignore
          const itemHeight = item.height * viewport.scale;
          
          // @ts-ignore
          const text = item.str.trim();
          const words_in_item = text.split(/(\s+)/);
          let cursorX = x;
          
          for (const word_part of words_in_item) {
            if (word_part.trim()) {
              const charRatio = word_part.length / text.length;
              const wordWidth = itemWidth * charRatio;
              
              words.push({
                text: word_part.trim(),
                x: Math.round(cursorX),
                y: Math.round(y),
                width: Math.round(wordWidth),
                height: Math.round(itemHeight),
              });
            }
            const partRatio = word_part.length / text.length;
            cursorX += itemWidth * partRatio;
          }
        }
      }
      
      // Sort words by reading order
      words.sort((a, b) => {
        const yDiff = Math.abs(a.y - b.y);
        if (yDiff > 5) return a.y - b.y;
        return a.x - b.x;
      });
      
      pagesText.push({
        pageNumber: pageNum,
        words,
        width: viewport.width,
        height: viewport.height,
      });
      
      console.log(`✅ [Text Extract] Page ${pageNum}: ${words.length} words extracted`);
    }
    
    console.log(`✅ [Text Extract] Extraction complete: ${pagesText.length} pages`);
    return pagesText;
  } catch (error) {
    console.error("❌ [Text Extract] Error details:", error);
    throw error;
  }
}

