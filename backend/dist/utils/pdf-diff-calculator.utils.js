/**
 * PDF Diff Calculator - Cleaned up, PDF.js removed
 * Only contains simple text diff for change history using pdf-parse
 */
import { diffWords } from 'diff';
import { extractPdfText } from './pdf-extract.utils.js';
/**
 * Simple text diff for change history (fast & reliable)
 * Uses pdf-parse for simple text extraction and counting
 * @param originalPdfPath - Path to original PDF
 * @param modifiedPdfPath - Path to modified PDF
 * @returns Simple change counts for display
 */
export async function calculateSimpleTextDiff(originalPdfPath, modifiedPdfPath) {
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
            }
            else if (part.removed) {
                deletedCount += wordCount;
            }
        }
        // Calculate modified count (pairs of add/remove operations)
        modifiedCount = Math.min(addedCount, deletedCount);
        const actualAdded = addedCount - modifiedCount;
        const actualDeleted = deletedCount - modifiedCount;
        const result = {
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
    }
    catch (error) {
        console.error('❌ [Simple Diff] Failed:', error);
        throw new Error(`Failed to calculate simple text diff: ${error}`);
    }
}
//# sourceMappingURL=pdf-diff-calculator.utils.js.map