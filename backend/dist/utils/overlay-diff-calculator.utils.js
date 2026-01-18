/**
 * Overlay-based diff calculator - No PDF generation, just highlight coordinates
 * Replaces PDF.js complex coordinate system with simple text comparison + overlay data
 */
import { extractPdfText } from './pdf-extract.utils.js';
import { diffWords } from 'diff';
/**
 * Calculate diff for overlay highlighting (no PDF generation)
 * @param originalPdfPath - Path to original PDF
 * @param editedPdfPath - Path to edited PDF
 * @returns Overlay data for frontend highlighting
 */
export async function calculateOverlayDiff(originalPdfPath, editedPdfPath) {
    console.log('\n🎨 [Overlay Diff] Starting overlay diff calculation...');
    console.log(`📄 [Overlay Diff] Original: ${originalPdfPath}`);
    console.log(`📄 [Overlay Diff] Edited: ${editedPdfPath}`);
    try {
        // Step 1: Extract text using reliable pdf-parse (not PDF.js)
        console.log('📖 [Overlay Diff] Extracting text using pdf-parse...');
        const originalText = await extractPdfText(originalPdfPath);
        const editedText = await extractPdfText(editedPdfPath);
        console.log(`📊 [Overlay Diff] Original text: ${originalText.length} chars`);
        console.log(`📊 [Overlay Diff] Edited text: ${editedText.length} chars`);
        if (originalText.length === 0) {
            console.warn('⚠️ [Overlay Diff] WARNING: No text extracted from original PDF');
            console.warn('   This might indicate a scanned PDF or extraction issue');
        }
        if (editedText.length === 0) {
            console.warn('⚠️ [Overlay Diff] WARNING: No text extracted from edited PDF');
            console.warn('   This might indicate a scanned PDF or extraction issue');
        }
        // Step 2: Perform word-level diff
        console.log('🔍 [Overlay Diff] Performing word-level comparison...');
        const diffResult = diffWords(originalText, editedText);
        console.log(`📊 [Overlay Diff] Diff parts found: ${diffResult.length}`);
        // Step 3: Generate highlight data (no coordinates needed)
        const highlights = [];
        let addedCount = 0;
        let removedCount = 0;
        let modifiedCount = 0;
        console.log('🎯 [Overlay Diff] Generating highlight data...');
        for (let i = 0; i < diffResult.length; i++) {
            const part = diffResult[i];
            if (!part)
                continue; // Skip undefined parts
            const words = part.value.trim().split(/\s+/).filter(w => w.length > 0);
            if (part.added) {
                console.log(`   ➕ [Overlay Diff] Added: "${part.value.substring(0, 50)}..." (${words.length} words)`);
                // Create highlight for added text (will be green)
                highlights.push({
                    type: 'added',
                    text: part.value.trim(),
                    page: 1, // Frontend will search across all pages
                    searchText: part.value.trim(),
                    color: '#22c55e', // Green
                    opacity: 0.3
                });
                addedCount += words.length;
            }
            else if (part.removed) {
                console.log(`   ➖ [Overlay Diff] Removed: "${part.value.substring(0, 50)}..." (${words.length} words)`);
                // For removed text, we need to show it somehow in the edited PDF
                // We'll create a "ghost" highlight that frontend can handle
                highlights.push({
                    type: 'removed',
                    text: part.value.trim(),
                    page: 1, // Frontend will determine placement
                    searchText: '', // No search text since it's not in edited PDF
                    color: '#ef4444', // Red
                    opacity: 0.3
                });
                removedCount += words.length;
            }
        }
        // Calculate modified count (pairs of add/remove)
        modifiedCount = Math.min(addedCount, removedCount);
        const actualAdded = addedCount - modifiedCount;
        const actualRemoved = removedCount - modifiedCount;
        const result = {
            highlights,
            summary: {
                addedCount: actualAdded,
                removedCount: actualRemoved,
                modifiedCount,
                totalChanges: actualAdded + actualRemoved + modifiedCount
            },
            editedPdfPath // Return existing edited PDF path (no new file)
        };
        console.log('✅ [Overlay Diff] Overlay diff calculation complete!');
        console.log(`   📊 Summary:`);
        console.log(`      ➕ Added: ${result.summary.addedCount} words`);
        console.log(`      ➖ Removed: ${result.summary.removedCount} words`);
        console.log(`      🔄 Modified: ${result.summary.modifiedCount} words`);
        console.log(`      📝 Total changes: ${result.summary.totalChanges} words`);
        console.log(`      🎨 Highlights generated: ${highlights.length}`);
        console.log(`   📄 Edited PDF path: ${editedPdfPath}`);
        return result;
    }
    catch (error) {
        console.error('❌ [Overlay Diff] FAILED to calculate overlay diff!');
        console.error('❌ [Overlay Diff] Error type:', error?.constructor?.name || typeof error);
        console.error('❌ [Overlay Diff] Error message:', error instanceof Error ? error.message : String(error));
        console.error('❌ [Overlay Diff] Full error:', error);
        console.error('❌ [Overlay Diff] Original PDF path:', originalPdfPath);
        console.error('❌ [Overlay Diff] Edited PDF path:', editedPdfPath);
        throw new Error(`Failed to calculate overlay diff: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Generate simple highlight data for frontend (fallback method)
 * @param editedPdfPath - Path to edited PDF
 * @returns Basic highlight data for testing
 */
export async function generateTestHighlights(editedPdfPath) {
    console.log('\n🧪 [Test Highlights] Generating test highlights for debugging...');
    console.log(`📄 [Test Highlights] Edited PDF: ${editedPdfPath}`);
    try {
        // Create some test highlights for debugging
        const testHighlights = [
            {
                type: 'added',
                text: 'test change',
                page: 1,
                searchText: 'test change',
                color: '#22c55e',
                opacity: 0.3
            }
        ];
        const result = {
            highlights: testHighlights,
            summary: {
                addedCount: 2,
                removedCount: 0,
                modifiedCount: 0,
                totalChanges: 2
            },
            editedPdfPath
        };
        console.log('✅ [Test Highlights] Test highlights generated successfully');
        console.log(`   🎨 Test highlights: ${testHighlights.length}`);
        return result;
    }
    catch (error) {
        console.error('❌ [Test Highlights] Failed to generate test highlights:', error);
        throw error;
    }
}
//# sourceMappingURL=overlay-diff-calculator.utils.js.map