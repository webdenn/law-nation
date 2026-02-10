import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// ✅ Worker Setup
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.mjs`;
}

/**
 * 1️⃣ EXTRACT TEXT (Fixed: Better Spacing Detection)
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

      // Sort items by Y (top-down) then X (left-right)
      const items = textContent.items.sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 5) return yDiff;
        return a.transform[4] - b.transform[4];
      });

      let pageText = '';
      let lastY = null;
      let lastX = null;
      let lastItem = null;

      for (const item of items) {
        const currentY = item.transform[5];
        const currentX = item.transform[4];
        const text = item.str;

        // New Line Detection
        if (lastY !== null && Math.abs(lastY - currentY) > 5) {
          pageText += '\n';
          lastX = null;
          lastItem = null;
        }
        // Space Detection
        else if (lastX !== null && lastItem !== null) {
          const gap = currentX - lastX;
          // Use smaller threshold (0.2) to catch small gaps
          const estimatedCharWidth = (item.width > 0 ? item.width / text.length : item.height * 0.5);

          if (gap > estimatedCharWidth * 0.2) {
            if (!pageText.endsWith(' ')) {
              pageText += ' ';
            }
          }
        }

        pageText += text;
        lastY = currentY;
        lastX = currentX + (item.width || 0);
        lastItem = item;
      }

      pages.push(pageText);
      fullText += pageText + '\n\n';
    }

    return { fullText: fullText.trim(), pages, numPages: pdf.numPages };
  } catch (error) {
    console.error('Extraction Error:', error);
    throw new Error(`Failed to extract text: ${error.message}`);
  }
}

/**
 * Helper: Sanitize Text
 */
function sanitizeForPdfLib(text) {
  if (!text) return '';
  return text
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 2️⃣ GENERATE PDF (Fixed: Strikethrough Line Added)
 */
export async function generateComparisonPDF(differences) {
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Logo Logic REMOVED as per user request
    let logoImage = null;
    /* 
    // Logo removed
    try {
      const logoResponse = await fetch('/law/logo.jpg').catch(() => fetch('/logo.jpg'));
      if (logoResponse.ok) {
        const logoBytes = await logoResponse.arrayBuffer();
        logoImage = await pdfDoc.embedJpg(logoBytes);
      }
    } catch (e) { console.warn('Logo error:', e); }
    */

    const { width, height } = { width: 595.28, height: 841.89 }; // A4
    const margin = 50;
    const logoHeight = 40;
    const logoWidth = logoImage ? (logoImage.width / logoImage.height) * logoHeight : 0;
    const contentStartY = height - margin - logoHeight - 20;
    const fontSize = 11;
    const lineHeight = 18;
    const maxWidth = width - (margin * 2);

    let page = pdfDoc.addPage([width, height]);
    let y = contentStartY;
    let pageNumber = 1;

    // Header Helper
    const drawPageHeader = (currPage) => {
      if (logoImage) {
        currPage.drawImage(logoImage, {
          x: margin,
          y: height - margin - logoHeight,
          width: logoWidth,
          height: logoHeight
        });
      }
    };

    // Calculate Stats
    let addedCount = 0, removedCount = 0, unchangedCount = 0;
    differences.forEach(diff => {
      const wordCount = diff.value.trim().split(/\s+/).filter(w => w.length > 0).length;
      if (diff.added) addedCount += wordCount;
      else if (diff.removed) removedCount += wordCount;
      else unchangedCount += wordCount;
    });

    const addNewPage = () => {
      page.drawText(`Page ${pageNumber}`, { x: width / 2 - 20, y: 20, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
      pageNumber++;
      page = pdfDoc.addPage([width, height]);
      drawPageHeader(page);
      y = contentStartY;
      return page;
    };

    // --- First Page Header & Stats ---
    drawPageHeader(page);
    page.drawText('Document Comparison Report', { x: margin, y, size: 24, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
    y -= 40;

    // Stats Box
    const boxHeight = 100;
    const boxY = y - boxHeight;
    page.drawRectangle({ x: margin, y: boxY, width: maxWidth, height: boxHeight, color: rgb(0.95, 0.95, 0.97), borderColor: rgb(0.7, 0.7, 0.75), borderWidth: 1 });

    // Stats Text
    page.drawText(`Added Words: ${addedCount}`, { x: margin + 20, y: boxY + 70, size: 12, font, color: rgb(0, 0.5, 0) });
    page.drawText(`Removed Words: ${removedCount}`, { x: margin + 20, y: boxY + 45, size: 12, font, color: rgb(0.7, 0, 0) });
    page.drawText(`Unchanged Words: ${unchangedCount}`, { x: margin + 20, y: boxY + 20, size: 12, font, color: rgb(0.3, 0.3, 0.3) });

    y = boxY - 40;

    // Legend
    page.drawText('Legend:  +Added   -Removed', { x: margin, y, size: 12, font: italicFont, color: rgb(0.2, 0.2, 0.2) });
    y -= 30;

    page.drawText('Detailed Changes', { x: margin, y, size: 16, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
    y -= 30;

    // --- CONTENT DRAWING LOOP ---
    let currentX = margin;
    let currentY = y;

    for (const diff of differences) {
      const color = diff.added ? rgb(0, 0.6, 0) : diff.removed ? rgb(0.8, 0, 0) : rgb(0.2, 0.2, 0.2);
      const bgColor = diff.added ? rgb(0.9, 1, 0.9) : rgb(1, 0.9, 0.9);
      const useFont = diff.added || diff.removed ? boldFont : font;

      const cleanText = sanitizeForPdfLib(diff.value);
      if (!cleanText) continue;

      for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];

        // Handle Newlines
        if (char === '\n') {
          currentX = margin;
          currentY -= lineHeight;
          if (currentY < margin + 40) {
            addNewPage();
            currentY = height - margin - logoHeight - 20;
          }
          continue;
        }

        const charWidth = useFont.widthOfTextAtSize(char, fontSize);

        // Wrap Text
        if (currentX + charWidth > width - margin) {
          currentX = margin;
          currentY -= lineHeight;
          if (currentY < margin + 40) {
            addNewPage();
            currentY = height - margin - logoHeight - 20;
          }
        }

        // 1. Draw Background
        if (diff.added || diff.removed) {
          page.drawRectangle({
            x: currentX, y: currentY - 2,
            width: charWidth, height: lineHeight - 2,
            color: bgColor
          });
        }

        // 2. Draw Character
        page.drawText(char, {
          x: currentX, y: currentY,
          size: fontSize, font: useFont, color
        });

        // 3. ✅ STRIKETHROUGH LOGIC (Only for removed text)
        if (diff.removed) {
          page.drawLine({
            start: { x: currentX, y: currentY + (fontSize / 3) },
            end: { x: currentX + charWidth, y: currentY + (fontSize / 3) },
            thickness: 1.5,
            color: rgb(0.8, 0, 0),
            opacity: 0.8
          });
        }

        currentX += charWidth;
      }
    }

    // Page number for last page
    page.drawText(`Page ${pageNumber}`, { x: width / 2 - 20, y: 20, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

    return await pdfDoc.save();
  } catch (error) {
    console.error(error);
    throw new Error(`PDF Generation Error: ${error.message}`);
  }
}

/**
 * 3️⃣ DOWNLOAD HELPER
 */
export function downloadPDF(pdfBytes, filename = 'diff-report.pdf') {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}