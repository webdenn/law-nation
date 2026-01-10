import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';

// Create require for CommonJS modules in ES module context
const require = createRequire(import.meta.url);

// Import docx-pdf (CommonJS module)
const docxPdf = require('docx-pdf');
const convertDocxToPdfAsync = promisify(docxPdf);

// Supabase client for uploading converted files
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'Articles';

const supabase = SUPABASE_URL && SUPABASE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

/**
 * Check if a path is a URL
 */
function isUrl(filePath: string): boolean {
  return filePath.startsWith('http://') || filePath.startsWith('https://');
}

/**
 * Download file from URL to temp location
 */
async function downloadFile(url: string, extension: string): Promise<string> {
  console.log(`🌐 [Download] Fetching file from URL: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  
  const buffer = await response.arrayBuffer();
  const tempPath = `/tmp/temp-${Date.now()}${extension}`;
  await fs.writeFile(tempPath, Buffer.from(buffer));
  
  console.log(`✅ [Download] Saved to temp: ${tempPath}`);
  return tempPath;
}

/**
 * Upload file to Supabase storage
 */
async function uploadToSupabase(
  localFilePath: string,
  originalUrl: string
): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  console.log(`☁️ [Upload] Uploading converted file to Supabase`);
  
  const fileBuffer = await fs.readFile(localFilePath);
  const extension = path.extname(localFilePath);
  
  // Extract path from original URL and modify extension
  const urlPath = new URL(originalUrl).pathname;
  const pathParts = urlPath.split('/').filter(part => part.length > 0);
  const originalFileName = pathParts[pathParts.length - 1] || `file-${Date.now()}`;
  const newFileName = originalFileName.replace(/\.[^.]+$/, extension);
  
  // Use same path structure as original
  const storagePath = `articles/${newFileName}`;
  
  const contentType = extension === '.pdf' 
    ? 'application/pdf' 
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  
  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true
    });
  
  if (error) {
    console.error('❌ [Upload] Supabase upload error:', error);
    throw error;
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(storagePath);
  
  console.log(`✅ [Upload] Uploaded to: ${publicUrl}`);
  return publicUrl;
}

/**
 * Convert Word document to PDF
 * Handles both local paths and remote URLs (Supabase)
 */
export async function convertWordToPdf(
  wordFilePath: string
): Promise<string> {
  let localWordPath: string;
  let localPdfPath: string;
  let isRemote = false;
  let tempWordPath: string | null = null;
  let tempPdfPath: string | null = null;
  
  try {
    // Check if it's a URL (Supabase) or local path
    if (isUrl(wordFilePath)) {
      isRemote = true;
      
      // Download Word file from URL to temp location
      tempWordPath = await downloadFile(wordFilePath, '.docx');
      localWordPath = tempWordPath;
      
      // Create temp path for PDF output
      tempPdfPath = `/tmp/temp-${Date.now()}.pdf`;
      localPdfPath = tempPdfPath;
    } else {
      // Local file path
      localWordPath = path.join(process.cwd(), wordFilePath);
      const pdfPath = wordFilePath.replace(/\.docx?$/i, '.pdf');
      localPdfPath = path.join(process.cwd(), pdfPath);
    }
    
    console.log(`🔄 [Conversion] Converting Word to PDF: ${wordFilePath}`);
    
    // Convert using docx-pdf
    await convertDocxToPdfAsync(localWordPath, localPdfPath);
    
    console.log(`✅ [Conversion] Word to PDF successful`);
    
    // If remote, upload converted file back to Supabase
    if (isRemote) {
      const uploadedUrl = await uploadToSupabase(localPdfPath, wordFilePath);
      
      // Clean up temp files
      if (tempWordPath) await fs.unlink(tempWordPath).catch(() => {});
      if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => {});
      
      return uploadedUrl;
    }
    
    // Return local path
    return wordFilePath.replace(/\.docx?$/i, '.pdf');
  } catch (error) {
    // Clean up temp files on error
    if (tempWordPath) await fs.unlink(tempWordPath).catch(() => {});
    if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => {});
    
    console.error('❌ [Conversion] Word to PDF error:', error);
    throw new Error(`Failed to convert Word to PDF: ${error}`);
  }
}

/**
 * Convert PDF to Word document
 * Handles both local paths and remote URLs (Supabase)
 * Note: This is a basic conversion that extracts text and creates a simple Word doc
 */
export async function convertPdfToWord(
  pdfFilePath: string
): Promise<string> {
  let localPdfPath: string;
  let localWordPath: string;
  let isRemote = false;
  let tempPdfPath: string | null = null;
  let tempWordPath: string | null = null;
  
  try {
    // Check if it's a URL (Supabase) or local path
    if (isUrl(pdfFilePath)) {
      isRemote = true;
      
      // Download PDF file from URL to temp location
      tempPdfPath = await downloadFile(pdfFilePath, '.pdf');
      localPdfPath = tempPdfPath;
      
      // Create temp path for Word output
      tempWordPath = `/tmp/temp-${Date.now()}.docx`;
      localWordPath = tempWordPath;
    } else {
      // Local file path
      localPdfPath = path.join(process.cwd(), pdfFilePath);
      const wordPath = pdfFilePath.replace(/\.pdf$/i, '.docx');
      localWordPath = path.join(process.cwd(), wordPath);
    }
    
    console.log(`🔄 [Conversion] Converting PDF to Word: ${pdfFilePath}`);
    
    // For PDF to Word, we'll use pdf-parse to extract text
    const { PDFParse } = require('pdf-parse');
    const pdfBuffer = await fs.readFile(localPdfPath);
    
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
    await fs.writeFile(localWordPath, buffer);
    
    console.log(`✅ [Conversion] PDF to Word successful`);
    
    // If remote, upload converted file back to Supabase
    if (isRemote) {
      const uploadedUrl = await uploadToSupabase(localWordPath, pdfFilePath);
      
      // Clean up temp files
      if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => {});
      if (tempWordPath) await fs.unlink(tempWordPath).catch(() => {});
      
      return uploadedUrl;
    }
    
    // Return local path
    return pdfFilePath.replace(/\.pdf$/i, '.docx');
  } catch (error) {
    // Clean up temp files on error
    if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => {});
    if (tempWordPath) await fs.unlink(tempWordPath).catch(() => {});
    
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
