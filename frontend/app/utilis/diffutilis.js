import * as Diff from 'diff';

/**
 * Compare two texts and return differences (preserves spaces)
 */
export function compareTexts(originalText, modifiedText) {
  // ✅ Use diffWordsWithSpace to preserve spacing between words
  const differences = Diff.diffWordsWithSpace(originalText, modifiedText);
  
  return differences;
}

/**
 * Get statistics about changes
 */
export function getChangeStats(differences) {
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  
  differences.forEach(diff => {
    const wordCount = diff.value.trim().split(/\s+/).filter(w => w.length > 0).length;
    
    if (diff.added) {
      added += wordCount;
    } else if (diff.removed) {
      removed += wordCount;
    } else {
      unchanged += wordCount;
    }
  });
  
  return {
    added,
    removed,
    unchanged,
    total: added + removed + unchanged
  };
}

/**
 * Format differences for display
 */
export function formatDifferences(differences) {
  return differences.map(diff => {
    let className = '';
    let prefix = '';
    
    if (diff.added) {
      className = 'added';
      prefix = '+ ';
    } else if (diff.removed) {
      className = 'removed';
      prefix = '- ';
    } else {
      className = 'unchanged';
      prefix = '  ';
    }
    
    return {
      ...diff,
      className,
      prefix,
      displayValue: prefix + diff.value
    };
  });
}
