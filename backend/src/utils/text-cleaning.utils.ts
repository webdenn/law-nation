/**
 * Text Cleaning Utility
 * Removes watermark content from extracted text
 */

// Fixed watermark patterns that should be removed
const WATERMARK_PATTERNS = [
  'DOWNLOADED FROM LAW NATION DATE',
  'User: LAW NATION',
  'Article:',
  'View online:',
  'http://localhost:3000',
  'https://localhost:3000',
  '═══════════════════════════════════════',
  '-------------------------------------------',
  '___________________________________________',
];

/**
 * Check if a line contains watermark content
 */
export function isWatermarkLine(line: string): boolean {
  const trimmedLine = line.trim();
  
  // Skip empty lines
  if (!trimmedLine) {
    return false;
  }
  
  // Check against watermark patterns
  for (const pattern of WATERMARK_PATTERNS) {
    if (trimmedLine.includes(pattern)) {
      console.log(`🧹 [Text Clean] Removing watermark line: "${trimmedLine.substring(0, 50)}..."`);
      return true;
    }
  }
  
  // Check for lines with only symbols (separators)
  if (/^[═\-_=\s]+$/.test(trimmedLine)) {
    console.log(`🧹 [Text Clean] Removing separator line: "${trimmedLine}"`);
    return true;
  }
  
  return false;
}

/**
 * Clean watermark content from extracted text
 */
export function cleanWatermarkText(rawText: string): string {
  console.log(`🧹 [Text Clean] Starting text cleaning process`);
  console.log(`🧹 [Text Clean] Original text length: ${rawText.length} characters`);
  
  // Split text into lines
  const lines = rawText.split('\n');
  console.log(`🧹 [Text Clean] Total lines: ${lines.length}`);
  
  // Filter out watermark lines
  const cleanLines = lines.filter(line => !isWatermarkLine(line));
  console.log(`🧹 [Text Clean] Lines after filtering: ${cleanLines.length}`);
  
  // Join clean lines back together
  let cleanText = cleanLines.join('\n');
  
  // Remove excessive whitespace
  cleanText = cleanText
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple empty lines with double line break
    .replace(/^\s+|\s+$/g, '') // Trim start and end whitespace
    .replace(/[ \t]+/g, ' '); // Replace multiple spaces/tabs with single space
  
  console.log(`🧹 [Text Clean] Final text length: ${cleanText.length} characters`);
  console.log(`🧹 [Text Clean] Removed ${rawText.length - cleanText.length} characters`);
  
  return cleanText;
}

/**
 * Get list of watermark patterns (for debugging/testing)
 */
export function getWatermarkPatterns(): string[] {
  return [...WATERMARK_PATTERNS];
}