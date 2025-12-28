import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { createRequire } from 'module';

// Create require for CommonJS modules in ES module context
const require = createRequire(import.meta.url);

// Import docx-pdf (CommonJS module)
const docxPdf = require('docx-pdf');
const convertDocxToPdfAsync = promisify(docxPdf);

/**
 * Convert Word document to PDF
 */
export async function convertWordToPdf(
  wordFilePath: string
): Promise<string> {
  try {
    const fullWordPath = path.join(process.cwd(), wordFilePath);
    
    // Generate PDF path (same directory, same name, .pdf extension)
    const pdfPath = wordFilePath.replace(/\.docx?$/i, '.pdf');
    const fullPdfPath = path.join(process.cwd(), pdfPath);
    
    console.log(`🔄 [Conversion] Converting Word to PDF: ${wordFilePath} → ${pdfPath}`);
    
    // Convert using docx-pdf
    await convertDocxToPdfAsync(fullWordPath, fullPdfPath);
    
    console.log(`✅ [Conversion] Word to PDF successful: ${pdfPath}`);
    return pdfPath;
  } catch (error) {
    console.error('❌ [Conversion] Word to PDF error:', error);
    throw new Error(`Failed to convert Word to PDF: ${error}`);
  }
}

/**
 * Convert PDF to Word document
 * Note: This is a basic conversion that extracts text and creates a simple Word doc
 * For better conversion, consider using external services or libraries
 */
export async function convertPdfToWord(
  pdfFilePath: string
): Promise<string> {
  try {
    const fullPdfPath = path.join(process.cwd(), pdfFilePath);
    
    // Generate Word path (same directory, same name, .docx extension)
    const wordPath = pdfFilePath.replace(/\.pdf$/i, '.docx');
    const fullWordPath = path.join(process.cwd(), wordPath);
    
    console.log(`🔄 [Conversion] Converting PDF to Word: ${pdfFilePath} → ${wordPath}`);
    
    // For PDF to Word, we'll use pdf-parse to extract text
    // and create a simple Word document
    const { PDFParse } = require('pdf-parse');
    const pdfBuffer = await fs.readFile(fullPdfPath);
    
    // Create parser instance and extract text
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    await parser.destroy();
    
    // Create a simple Word document with the extracted text
    const { Document, Packer, Paragraph, TextRun } = await import('docx');
    
    // Split text into paragraphs
    const paragraphs = result.text.split('\n\n').map((text: string) => 
      new Paragraph({
        children: [new TextRun(text.trim())],
      })
    );
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
    });
    
    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(fullWordPath, buffer);
    
    console.log(`✅ [Conversion] PDF to Word successful: ${wordPath}`);
    return wordPath;
  } catch (error) {
    console.error('❌ [Conversion] PDF to Word error:', error);
    throw new Error(`Failed to convert PDF to Word: ${error}`);
  }
}

/**
 * Detect file type from extension
 */
export function getFileType(filePath: string): 'pdf' | 'docx' | 'unknown' {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.pdf') return 'pdf';
  if (ext === '.docx' || ext === '.doc') return 'docx';
  return 'unknown';
}

/**
 * Ensure both PDF and Word versions exist
 * Converts the file if the other format doesn't exist
 */
export async function ensureBothFormats(
  filePath: string
): Promise<{ pdfPath: string; wordPath: string }> {
  const fileType = getFileType(filePath);
  
  if (fileType === 'unknown') {
    throw new Error(`Unknown file type: ${filePath}`);
  }
  
  let pdfPath: string;
  let wordPath: string;
  
  if (fileType === 'pdf') {
    pdfPath = filePath;
    wordPath = await convertPdfToWord(filePath);
  } else {
    wordPath = filePath;
    pdfPath = await convertWordToPdf(filePath);
  }
  
  return { pdfPath, wordPath };
}
