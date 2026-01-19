/**
 * Utility functions for cleaning text content before database storage
 */

/**
 * Clean text for database storage by removing null bytes and other problematic characters
 * that can cause PostgreSQL UTF-8 encoding errors
 */
export function cleanTextForDatabase(text: string): string {
  if (!text) return '';
  
  return text
    // Remove null bytes (0x00) that cause PostgreSQL UTF-8 errors
    .replace(/\x00/g, '')
    // Remove other control characters that might cause issues (except newlines, tabs, carriage returns)
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Trim whitespace
    .trim();
}

/**
 * Clean watermark text content (existing function from word-watermark.utils.ts)
 * Removes common watermark patterns and cleans up text
 */
export function cleanWatermarkText(text: string): string {
  if (!text) return '';

  let cleanedText = text;

  // Remove common watermark patterns
  const watermarkPatterns = [
    /LAW NATION EDITOR/gi,
    /Downloaded on.*?\d{4}/gi,
    /Article ID:.*?[a-zA-Z0-9]+/gi,
    /Visit.*?law.*?nation/gi,
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, // Date patterns
    /\b\d{1,2}:\d{2}:\d{2}\s*(AM|PM)?\b/gi, // Time patterns
  ];

  watermarkPatterns.forEach(pattern => {
    cleanedText = cleanedText.replace(pattern, '');
  });

  // Clean up extra whitespace and normalize
  cleanedText = cleanedText
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  return cleanedText;
}