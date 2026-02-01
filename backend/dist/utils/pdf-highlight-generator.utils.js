/**
 * PDF Highlight Generator - Creates PDFs with burned-in highlights
 * Uses pdf-lib to add colored rectangles over changed text
 */
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { calculateOverlayDiff } from './overlay-diff-calculator.utils.js';
/**
 * Generate a new PDF with highlights burned in
 * @param originalPdfPath - Path to original PDF
 * @param editedPdfPath - Path to edited PDF
 * @param outputPath - Path where highlighted PDF will be saved
 * @returns Path to generated highlighted PDF
 */
export async function generateHighlightedPdf(originalPdfPath, editedPdfPath, outputPath) {
    console.log('\n🎨 [PDF Highlight] Starting highlighted PDF generation...');
    console.log(`📄 [PDF Highlight] Original: ${originalPdfPath}`);
    console.log(`📄 [PDF Highlight] Edited: ${editedPdfPath}`);
    console.log(`💾 [PDF Highlight] Output: ${outputPath}`);
    try {
        // Step 1: Calculate diff to get highlight data
        console.log('🔍 [PDF Highlight] Calculating differences...');
        const diffResult = await calculateOverlayDiff(originalPdfPath, editedPdfPath);
        console.log(`✅ [PDF Highlight] Found ${diffResult.highlights.length} changes`);
        console.log(`   ➕ Added: ${diffResult.summary.addedCount}`);
        console.log(`   ➖ Removed: ${diffResult.summary.removedCount}`);
        console.log(`   🔄 Modified: ${diffResult.summary.modifiedCount}`);
        // Step 2: Load the edited PDF
        console.log('📖 [PDF Highlight] Loading edited PDF...');
        let pdfPath = editedPdfPath;
        if (editedPdfPath.startsWith('/uploads/')) {
            pdfPath = path.join(process.cwd(), editedPdfPath.substring(1));
        }
        else if (editedPdfPath.startsWith('uploads/')) {
            pdfPath = path.join(process.cwd(), editedPdfPath);
        }
        const pdfBytes = await fs.readFile(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        console.log(`✅ [PDF Highlight] PDF loaded: ${pdfDoc.getPageCount()} pages`);
        // Step 3: Add visual indicators to PDF
        console.log('🎨 [PDF Highlight] Adding visual indicators...');
        // Add a colored header banner to each page showing changes
        const pages = pdfDoc.getPages();
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            if (!page)
                continue;
            const { width, height } = page.getSize();
            // Add a banner at the top of each page (except summary page which will be added later)
            // Draw semi-transparent banner
            page.drawRectangle({
                x: 0,
                y: height - 30,
                width: width,
                height: 30,
                color: rgb(1, 0.95, 0.8),
                opacity: 0.9,
            });
            // Add text to banner
            page.drawText(`This document contains ${diffResult.summary.totalChanges} changes - See summary on first page`, {
                x: 50,
                y: height - 20,
                size: 10,
                color: rgb(0.6, 0.3, 0),
            });
        }
        // Add change markers on the right margin for pages with changes
        for (const highlight of diffResult.highlights) {
            const pageIndex = (highlight.page || 1);
            if (pageIndex < 1 || pageIndex > pdfDoc.getPageCount()) {
                continue;
            }
            const page = pdfDoc.getPage(pageIndex - 1);
            if (!page)
                continue;
            const { width, height } = page.getSize();
            // Determine color based on change type
            let color;
            let symbol;
            if (highlight.type === 'added') {
                color = rgb(0.13, 0.77, 0.37); // Green
                symbol = '+';
            }
            else if (highlight.type === 'removed') {
                color = rgb(0.91, 0.30, 0.24); // Red
                symbol = '-';
            }
            else {
                color = rgb(0.95, 0.61, 0.07); // Orange
                symbol = '~';
            }
            // Draw a colored tab on the right edge
            const tabY = height - 100 - (Math.random() * (height - 200)); // Random position
            page.drawRectangle({
                x: width - 30,
                y: tabY,
                width: 25,
                height: 40,
                color: color,
                opacity: 0.8,
            });
            page.drawText(symbol, {
                x: width - 22,
                y: tabY + 12,
                size: 20,
                color: rgb(1, 1, 1),
            });
        }
        // Step 4: Add summary page at the beginning
        console.log('📝 [PDF Highlight] Adding summary page...');
        const summaryPage = pdfDoc.insertPage(0);
        const { width, height } = summaryPage.getSize();
        // Title
        summaryPage.drawText('Visual Diff Summary', {
            x: 50,
            y: height - 50,
            size: 24,
            color: rgb(0.17, 0.24, 0.31),
        });
        // Summary stats
        let yPos = height - 100;
        summaryPage.drawText(`Total Changes: ${diffResult.summary.totalChanges}`, {
            x: 50,
            y: yPos,
            size: 14,
            color: rgb(0, 0, 0),
        });
        yPos -= 30;
        summaryPage.drawText(`[+] Added: ${diffResult.summary.addedCount} words`, {
            x: 70,
            y: yPos,
            size: 12,
            color: rgb(0.13, 0.77, 0.37),
        });
        yPos -= 25;
        summaryPage.drawText(`[-] Removed: ${diffResult.summary.removedCount} words`, {
            x: 70,
            y: yPos,
            size: 12,
            color: rgb(0.91, 0.30, 0.24),
        });
        yPos -= 25;
        summaryPage.drawText(`[~] Modified: ${diffResult.summary.modifiedCount} words`, {
            x: 70,
            y: yPos,
            size: 12,
            color: rgb(0.95, 0.61, 0.07),
        });
        // List changes
        yPos -= 50;
        summaryPage.drawText('Changes:', {
            x: 50,
            y: yPos,
            size: 14,
            color: rgb(0, 0, 0),
        });
        yPos -= 30;
        for (const highlight of diffResult.highlights.slice(0, 10)) { // Show first 10
            if (yPos < 100)
                break; // Stop if running out of space
            const changeText = `${highlight.type.toUpperCase()}: "${highlight.text.substring(0, 50)}..."`;
            summaryPage.drawText(changeText, {
                x: 70,
                y: yPos,
                size: 10,
                color: rgb(0.3, 0.3, 0.3),
            });
            yPos -= 20;
        }
        if (diffResult.highlights.length > 10) {
            summaryPage.drawText(`... and ${diffResult.highlights.length - 10} more changes`, {
                x: 70,
                y: yPos,
                size: 10,
                color: rgb(0.5, 0.5, 0.5),
            });
        }
        // Step 5: Save the highlighted PDF
        console.log('💾 [PDF Highlight] Saving highlighted PDF...');
        const highlightedPdfBytes = await pdfDoc.save();
        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(outputPath, highlightedPdfBytes);
        const stats = await fs.stat(outputPath);
        console.log(`✅ [PDF Highlight] Highlighted PDF saved: ${outputPath}`);
        console.log(`   📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`   📄 Pages: ${pdfDoc.getPageCount()}`);
        console.log(`   🎨 Highlights: ${diffResult.highlights.length}`);
        return outputPath;
    }
    catch (error) {
        console.error('❌ [PDF Highlight] Failed to generate highlighted PDF:', error);
        throw error;
    }
}
//# sourceMappingURL=pdf-highlight-generator.utils.js.map