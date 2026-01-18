/**
 * Overlay Visual Diff Generator - No PDF generation, just overlay data
 * Returns existing edited PDF + highlight data for frontend overlay
 */
import { calculateOverlayDiff } from './overlay-diff-calculator.utils.js';
import fs from 'fs';
import path from 'path';
/**
 * Generate visual diff using overlay approach (no PDF generation)
 * @param originalPdfPath - Path to original PDF
 * @param editedPdfPath - Path to edited PDF
 * @returns Visual diff response with overlay data
 */
export async function generateOverlayVisualDiff(originalPdfPath, editedPdfPath) {
    console.log('\n🎨 [Overlay Visual] Starting overlay visual diff generation...');
    console.log(`📄 [Overlay Visual] Original: ${originalPdfPath}`);
    console.log(`📄 [Overlay Visual] Edited: ${editedPdfPath}`);
    try {
        // Step 1: Verify files exist
        console.log('🔍 [Overlay Visual] Verifying PDF files exist...');
        let originalFullPath = originalPdfPath;
        if (originalPdfPath.startsWith('/uploads')) {
            originalFullPath = path.join(process.cwd(), originalPdfPath);
        }
        let editedFullPath = editedPdfPath;
        if (editedPdfPath.startsWith('/uploads')) {
            editedFullPath = path.join(process.cwd(), editedPdfPath);
        }
        if (!fs.existsSync(originalFullPath)) {
            console.error('❌ [Overlay Visual] Original PDF not found:', originalFullPath);
            throw new Error(`Original PDF not found: ${originalFullPath}`);
        }
        if (!fs.existsSync(editedFullPath)) {
            console.error('❌ [Overlay Visual] Edited PDF not found:', editedFullPath);
            throw new Error(`Edited PDF not found: ${editedFullPath}`);
        }
        console.log('✅ [Overlay Visual] Both PDF files found');
        console.log(`   📄 Original: ${originalFullPath} (${fs.statSync(originalFullPath).size} bytes)`);
        console.log(`   📄 Edited: ${editedFullPath} (${fs.statSync(editedFullPath).size} bytes)`);
        // Step 2: Calculate overlay diff (no PDF generation)
        console.log('🔍 [Overlay Visual] Calculating overlay diff...');
        const overlayResult = await calculateOverlayDiff(originalPdfPath, editedPdfPath);
        console.log('✅ [Overlay Visual] Overlay diff calculated successfully');
        console.log(`   🎨 Highlights: ${overlayResult.highlights.length}`);
        console.log(`   📊 Changes: ${overlayResult.summary.totalChanges}`);
        // Step 3: Prepare response (no new PDF file)
        const response = {
            success: true,
            pdfPath: editedPdfPath, // Return existing edited PDF path
            highlightData: {
                highlights: overlayResult.highlights,
                version: '1.0',
                timestamp: new Date().toISOString(),
                approach: 'overlay' // Indicates this is overlay-based, not PDF generation
            },
            summary: overlayResult.summary,
            message: `Visual diff ready with ${overlayResult.highlights.length} highlights`
        };
        console.log('✅ [Overlay Visual] Visual diff response prepared');
        console.log(`   📄 PDF path: ${response.pdfPath}`);
        console.log(`   🎨 Highlight data size: ${JSON.stringify(response.highlightData).length} chars`);
        console.log(`   📊 Summary: +${response.summary.addedCount} -${response.summary.removedCount} ~${response.summary.modifiedCount}`);
        return response;
    }
    catch (error) {
        console.error('❌ [Overlay Visual] FAILED to generate overlay visual diff!');
        console.error('❌ [Overlay Visual] Error type:', error?.constructor?.name || typeof error);
        console.error('❌ [Overlay Visual] Error message:', error instanceof Error ? error.message : String(error));
        console.error('❌ [Overlay Visual] Full error:', error);
        console.error('❌ [Overlay Visual] Original PDF:', originalPdfPath);
        console.error('❌ [Overlay Visual] Edited PDF:', editedPdfPath);
        // Return error response (no PDF generation failure)
        return {
            success: false,
            pdfPath: editedPdfPath, // Still return edited PDF path
            highlightData: {
                highlights: [],
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
                approach: 'overlay'
            },
            summary: {
                addedCount: 0,
                removedCount: 0,
                modifiedCount: 0,
                totalChanges: 0
            },
            message: `Failed to generate visual diff: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}
/**
 * Generate visual diff from change log (overlay approach)
 * @param changeLogId - Change log ID
 * @param articleId - Article ID
 * @param versionNumber - Version number
 * @param originalPdfPath - Path to original PDF
 * @param editedPdfPath - Path to edited PDF
 * @returns Visual diff response with overlay data
 */
export async function generateOverlayVisualDiffFromChangeLog(changeLogId, articleId, versionNumber, originalPdfPath, editedPdfPath) {
    console.log('\n🎨 [Overlay Visual Log] Starting overlay visual diff from change log...');
    console.log(`📋 [Overlay Visual Log] Change Log ID: ${changeLogId}`);
    console.log(`📄 [Overlay Visual Log] Article ID: ${articleId}`);
    console.log(`🔢 [Overlay Visual Log] Version: ${versionNumber}`);
    console.log(`📄 [Overlay Visual Log] Original: ${originalPdfPath}`);
    console.log(`📄 [Overlay Visual Log] Edited: ${editedPdfPath}`);
    try {
        // Use the same overlay approach
        const result = await generateOverlayVisualDiff(originalPdfPath, editedPdfPath);
        // Add change log metadata
        result.highlightData.changeLogId = changeLogId;
        result.highlightData.articleId = articleId;
        result.highlightData.versionNumber = versionNumber;
        console.log('✅ [Overlay Visual Log] Change log visual diff generated successfully');
        console.log(`   📋 Metadata added: changeLogId=${changeLogId}, version=${versionNumber}`);
        return result;
    }
    catch (error) {
        console.error('❌ [Overlay Visual Log] Failed to generate change log visual diff:', error);
        throw error;
    }
}
/**
 * Test overlay visual diff with debug data
 * @param editedPdfPath - Path to edited PDF
 * @returns Test visual diff response
 */
export async function generateTestOverlayVisualDiff(editedPdfPath) {
    console.log('\n🧪 [Test Overlay Visual] Generating test overlay visual diff...');
    console.log(`📄 [Test Overlay Visual] Edited PDF: ${editedPdfPath}`);
    try {
        // Create test response for debugging
        const response = {
            success: true,
            pdfPath: editedPdfPath,
            highlightData: {
                highlights: [
                    {
                        type: 'added',
                        text: 'test change',
                        page: 1,
                        searchText: 'test change',
                        color: '#22c55e',
                        opacity: 0.3
                    }
                ],
                version: '1.0-test',
                timestamp: new Date().toISOString(),
                approach: 'overlay-test'
            },
            summary: {
                addedCount: 2,
                removedCount: 0,
                modifiedCount: 0,
                totalChanges: 2
            },
            message: 'Test visual diff generated successfully'
        };
        console.log('✅ [Test Overlay Visual] Test visual diff generated');
        console.log(`   🧪 Test highlights: ${response.highlightData.highlights.length}`);
        return response;
    }
    catch (error) {
        console.error('❌ [Test Overlay Visual] Failed to generate test visual diff:', error);
        throw error;
    }
}
//# sourceMappingURL=overlay-visual-diff.utils.js.map