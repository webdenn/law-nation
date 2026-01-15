import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// ✅ Use unpkg CDN which has the legacy worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.mjs`;
}

/**
 * IMPROVED: Extract text from PDF with layout awareness
 * Uses Y-coordinates to detect new lines, preventing words from merging.
 */
export async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    const pages = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // ✅ Sort items by Y position (top to bottom), then X position (left to right)
      const items = textContent.items.sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5]; // Y coordinate (inverted)
        if (Math.abs(yDiff) > 5) return yDiff;
        return a.transform[4] - b.transform[4]; // X coordinate
      });
      
      let pageText = '';
      let lastY = null;
      let lastX = null;
      let lastItem = null;
      
      for (const item of items) {
        const currentY = item.transform[5];
        const currentX = item.transform[4];
        const text = item.str;
        
        if (!text.trim()) continue;
        
        // ✅ Detect new line: Y difference > 3 pixels (more sensitive)
        if (lastY !== null && Math.abs(lastY - currentY) > 3) {
          pageText += '\n';
          lastX = null;
          lastItem = null;
        } 
        // ✅ Add space between words on same line
        else if (lastX !== null && lastItem !== null) {
          const gap = currentX - lastX;
          
          // Calculate expected space: if gap is larger than a typical character, add space
          // Use font size as reference (typical char width is ~60% of font size)
          const estimatedCharWidth = item.height * 0.6;
          
          if (gap > estimatedCharWidth * 0.5) {
            pageText += ' ';
          }
        }
        
        pageText += text;
        lastY = currentY;
        lastX = currentX + item.width;
        lastItem = item;
      }
      
      pages.push(pageText);
      fullText += pageText + '\n\n';
    }
    
    return {
      fullText: fullText.trim(),
      pages,
      numPages: pdf.numPages
    };
  } catch (error) {
    console.error('Extraction Error Details:', error);
    console.error('Error stack:', error.stack);
    throw new Error(`Failed to extract text: ${error.message || 'The PDF might be encrypted or scanned.'}`);
  }
}

/**
 * IMPROVED: Sanitize text for PDF-Lib
 * Prevents "WinAnsi" encoding errors common in pdf-lib
 */
function sanitizeForPdfLib(text) {
  if (!text) return '';
  return text
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Keep only printable ASCII
    .replace(/\s+/g, ' ')               // Collapse multiple spaces
    .trim();
}

/**
 * ENHANCED: Generate Beautiful Comparison PDF
 * Features: Professional layout, color-coded diffs, statistics, page numbers, company logo
 */
export async function generateComparisonPDF(differences) {
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    
    // ✅ Load and embed company logo
    let logoImage = null;
    try {
      // Try to load logo from public assets or app assets
      const logoResponse = await fetch('/law/logo.jpg').catch(() => 
        fetch('/logo.jpg')
      );
      
      if (logoResponse.ok) {
        const logoBytes = await logoResponse.arrayBuffer();
        logoImage = await pdfDoc.embedJpg(logoBytes);
      }
    } catch (error) {
      console.warn('Could not load logo:', error);
      // Continue without logo - not critical
    }
    
    const { width, height } = { width: 595.28, height: 841.89 }; // A4 Size
    const margin = 60;
    const logoHeight = 40;
    const logoWidth = logoImage ? (logoImage.width / logoImage.height) * logoHeight : 0;
    const contentStartY = height - margin - logoHeight - 20; // Start content below logo
    const fontSize = 11;
    const lineHeight = 16;
    const maxWidth = width - (margin * 2);
    
    let page = pdfDoc.addPage([width, height]);
    let y = contentStartY;
    let pageNumber = 1;

    // Function to draw logo and header on each page
    const drawPageHeader = (currentPage, isFirstPage = false) => {
      if (logoImage) {
        currentPage.drawImage(logoImage, {
          x: margin,
          y: height - margin - logoHeight,
          width: logoWidth,
          height: logoHeight
        });
      }
    };

    // Calculate statistics
    let addedCount = 0, removedCount = 0, unchangedCount = 0;
    differences.forEach(diff => {
      const wordCount = diff.value.trim().split(/\s+/).filter(w => w.length > 0).length;
      if (diff.added) addedCount += wordCount;
      else if (diff.removed) removedCount += wordCount;
      else unchangedCount += wordCount;
    });

    const addNewPage = () => {
      // Add page number to previous page
      page.drawText(`Page ${pageNumber}`, {
        x: width / 2 - 20,
        y: 20,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5)
      });
      
      pageNumber++;
      page = pdfDoc.addPage([width, height]);
      drawPageHeader(page, false); // Draw header on new page
      y = contentStartY;
      return page;
    };

    // ========== FIRST PAGE ==========
    drawPageHeader(page, true);
    
    // Main Title
    page.drawText('Document Comparison Report', {
      x: margin,
      y,
      size: 24,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1)
    });
    y -= 40;

    // Statistics Box
    const boxHeight = 120;
    const boxY = y - boxHeight;
    
    // Background box
    page.drawRectangle({
      x: margin,
      y: boxY,
      width: maxWidth,
      height: boxHeight,
      color: rgb(0.95, 0.95, 0.97),
      borderColor: rgb(0.7, 0.7, 0.75),
      borderWidth: 1
    });

    // Statistics Title
    page.drawText('Change Summary', {
      x: margin + 15,
      y: boxY + boxHeight - 25,
      size: 14,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2)
    });

    // Statistics Content
    const statsY = boxY + boxHeight - 55;
    const statSpacing = 25;
    
    // Added
    page.drawRectangle({
      x: margin + 15,
      y: statsY - 5,
      width: 8,
      height: 8,
      color: rgb(0, 0.6, 0)
    });
    page.drawText(`Added Words: ${addedCount}`, {
      x: margin + 30,
      y: statsY - 3,
      size: 12,
      font,
      color: rgb(0, 0.5, 0)
    });

    // Removed
    page.drawRectangle({
      x: margin + 15,
      y: statsY - statSpacing - 5,
      width: 8,
      height: 8,
      color: rgb(0.8, 0, 0)
    });
    page.drawText(`Removed Words: ${removedCount}`, {
      x: margin + 30,
      y: statsY - statSpacing - 3,
      size: 12,
      font,
      color: rgb(0.7, 0, 0)
    });

    // Unchanged
    page.drawRectangle({
      x: margin + 15,
      y: statsY - (statSpacing * 2) - 5,
      width: 8,
      height: 8,
      color: rgb(0.4, 0.4, 0.4)
    });
    page.drawText(`Unchanged Words: ${unchangedCount}`, {
      x: margin + 30,
      y: statsY - (statSpacing * 2) - 3,
      size: 12,
      font,
      color: rgb(0.3, 0.3, 0.3)
    });

    y = boxY - 40;

    // Legend
    page.drawText('Legend:', {
      x: margin,
      y,
      size: 12,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2)
    });
    y -= 20;

    const legendItems = [
      { text: '+ Added text', color: rgb(0, 0.5, 0) },
      { text: '- Removed text', color: rgb(0.7, 0, 0) },
      { text: '  Unchanged text', color: rgb(0.3, 0.3, 0.3) }
    ];

    legendItems.forEach(item => {
      page.drawText(item.text, {
        x: margin + 10,
        y,
        size: 10,
        font: italicFont,
        color: item.color
      });
      y -= 18;
    });

    y -= 30;

    // ========== CONTENT PAGES ==========
    page.drawText('Detailed Changes', {
      x: margin,
      y,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1)
    });
    y -= 30;

    // ✅ Draw differences inline with proper positioning
    let currentX = margin;
    let currentY = y;
    
    for (const diff of differences) {
      const color = diff.added 
        ? rgb(0, 0.6, 0)  // ✅ Green for ADDED
        : diff.removed 
        ? rgb(0.8, 0, 0)  // ✅ Red for REMOVED
        : rgb(0.2, 0.2, 0.2);
      
      const useFont = diff.added || diff.removed ? boldFont : font;
      const cleanText = sanitizeForPdfLib(diff.value);
      if (!cleanText) continue;

      // Process character by character to handle newlines
      for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        
        if (char === '\n') {
          // Move to next line
          currentX = margin;
          currentY -= lineHeight;
          if (currentY < margin + 40) {
            addNewPage();
            currentY = height - margin - logoHeight - 20;
          }
        } else {
          const charWidth = useFont.widthOfTextAtSize(char, fontSize);
          
          // Check if we need to wrap
          if (currentX + charWidth > width - margin) {
            currentX = margin;
            currentY -= lineHeight;
            if (currentY < margin + 40) {
              addNewPage();
              currentY = height - margin - logoHeight - 20;
            }
          }
          
          // Draw background for added/removed
          if (diff.added || diff.removed) {
            const bgColor = diff.added 
              ? rgb(0.95, 1, 0.95)
              : rgb(1, 0.97, 0.97);
            page.drawRectangle({
              x: currentX - 1,
              y: currentY - 2,
              width: charWidth + 2,
              height: lineHeight - 2,
              color: bgColor
            });
          }
          
          // Draw character
          page.drawText(char, {
            x: currentX,
            y: currentY,
            size: fontSize,
            font: useFont,
            color
          });
          
          currentX += charWidth;
        }
      }
    }
    
    y = currentY - lineHeight;

    // Add page number to last page
    page.drawText(`Page ${pageNumber}`, {
      x: width / 2 - 20,
      y: 20,
      size: 9,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    return await pdfDoc.save();
  } catch (error) {
    throw new Error(`PDF Generation Error: ${error.message}`);
  }
}

export function downloadPDF(pdfBytes, filename = 'diff-report.pdf') {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}