import * as pdfjsLib from 'pdfjs-dist';
import fs from 'fs';
import path from 'path';

// Disable worker for Node.js environment
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

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
    
    // Load PDF document
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
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      
      const words: WordPosition[] = [];
      
      // Process each text item
      for (const item of textContent.items) {
        if ('str' in item && item.str.trim()) {
          const transform = item.transform;
          
          // Calculate position
          const x = transform[4];
          const y = transform[5];
          const width = item.width || 0;
          const height = item.height || 0;
          
          words.push({
            text: item.str.trim(),
            x,
            y,
            width,
            height,
          });
        }
      }
      
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
    const pageText = page.words.map(w => w.text).join(' ');
    plainText += pageText + '\n\n';
  }
  
  return plainText.trim();
}
