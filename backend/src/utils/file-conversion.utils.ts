// import fs from 'fs/promises';
// import path from 'path';
// import { createClient } from '@supabase/supabase-js';
// import { AdobeService } from '@/services/adobe.service.js';
// import { convertToWebPath } from '@/utils/file-path.utils.js';

// // Create require for CommonJS modules in ES module context
// // No longer needed as we're using Adobe services

// // Import docx-pdf (CommonJS module)
// // No longer needed as we're using Adobe services

// // Supabase client for uploading converted files (production only)
// const SUPABASE_URL = process.env.SUPABASE_URL || '';
// const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
// const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'Articles';
// const NODE_ENV = process.env.NODE_ENV || 'development';

// const supabase = SUPABASE_URL && SUPABASE_KEY && NODE_ENV === 'production'
//   ? createClient(SUPABASE_URL, SUPABASE_KEY)
//   : null;

// // Initialize Adobe service
// const adobeService = new AdobeService();

// /**
//  * Check if we should use local storage (development) or cloud storage (production)
//  */
// function useLocalStorage(): boolean {
//   return NODE_ENV === 'development' || NODE_ENV === 'local' || !supabase;
// }

// /**
//  * Check if a path is a URL
//  */
// function isUrl(filePath: string): boolean {
//   return filePath.startsWith('http://') || filePath.startsWith('https://');
// }

// /**
//  * Download file from URL to temp location
//  */
// async function downloadFile(url: string, extension: string): Promise<string> {
//   console.log(`🌐 [Download] Fetching file from URL: ${url}`);
  
//   const response = await fetch(url);
//   if (!response.ok) {
//     throw new Error(`Failed to download file: ${response.statusText}`);
//   }
  
//   const buffer = await response.arrayBuffer();
//   const tempPath = `/tmp/temp-${Date.now()}${extension}`;
//   await fs.writeFile(tempPath, Buffer.from(buffer));
  
//   console.log(`✅ [Download] Saved to temp: ${tempPath}`);
//   return tempPath;
// }

// /**
//  * Save converted file locally (development) or upload to Supabase (production)
//  */
// async function saveConvertedFile(
//   localFilePath: string,
//   originalUrl: string,
//   targetExtension: string
// ): Promise<string> {
//   if (useLocalStorage()) {
//     // Development: Save to local uploads directory
//     console.log(`💾 [Local] Saving converted file locally`);
    
//     const uploadsDir = path.join(process.cwd(), 'uploads');
//     const pdfsDir = path.join(uploadsDir, 'pdfs');
//     const wordsDir = path.join(uploadsDir, 'words');
    
//     // Ensure directories exist
//     await fs.mkdir(uploadsDir, { recursive: true });
//     await fs.mkdir(pdfsDir, { recursive: true });
//     await fs.mkdir(wordsDir, { recursive: true });
    
//     // Generate unique filename
//     const timestamp = Date.now();
//     const randomId = Math.floor(Math.random() * 1000000);
//     const fileName = `${timestamp}-${randomId}${targetExtension}`;
    
//     const targetDir = targetExtension === '.pdf' ? pdfsDir : wordsDir;
//     const targetPath = path.join(targetDir, fileName);
    
//     // Copy converted file to uploads directory
//     await fs.copyFile(localFilePath, targetPath);
    
//     // Return relative path for local development
//     const relativePath = `/uploads/${targetExtension === '.pdf' ? 'pdfs' : 'words'}/${fileName}`;
//     console.log(`✅ [Local] Saved to: ${relativePath}`);
    
//     return relativePath;
//   } else {
//     // Production: Upload to Supabase
//     return await uploadToSupabase(localFilePath, originalUrl);
//   }
// }

// /**
//  * Upload file to Supabase storage (production only)
//  */
// async function uploadToSupabase(
//   localFilePath: string,
//   originalUrl: string
// ): Promise<string> {
//   if (!supabase) {
//     throw new Error('Supabase client not initialized');
//   }
  
//   console.log(`☁️ [Upload] Uploading converted file to Supabase`);
  
//   const fileBuffer = await fs.readFile(localFilePath);
//   const extension = path.extname(localFilePath);
  
//   // Extract path from original URL and modify extension
//   const urlPath = new URL(originalUrl).pathname;
//   const pathParts = urlPath.split('/').filter(part => part.length > 0);
//   const originalFileName = pathParts[pathParts.length - 1] || `file-${Date.now()}`;
//   const newFileName = originalFileName.replace(/\.[^.]+$/, extension);
  
//   // Use same path structure as original
//   const storagePath = `articles/${newFileName}`;
  
//   const contentType = extension === '.pdf' 
//     ? 'application/pdf' 
//     : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  
//   const { data, error } = await supabase.storage
//     .from(SUPABASE_BUCKET)
//     .upload(storagePath, fileBuffer, {
//       contentType,
//       upsert: true
//     });
  
//   if (error) {
//     console.error('❌ [Upload] Supabase upload error:', error);
//     throw error;
//   }
  
//   // Get public URL
//   const { data: { publicUrl } } = supabase.storage
//     .from(SUPABASE_BUCKET)
//     .getPublicUrl(storagePath);
  
//   console.log(`✅ [Upload] Uploaded to: ${publicUrl}`);
//   return publicUrl;
// }

// /**
//  * Convert Word document to PDF using Adobe Services
//  * Handles both local paths and remote URLs (Supabase)
//  */
// export async function convertWordToPdf(
//   wordFilePath: string
// ): Promise<string> {
//   let localWordPath: string;
//   let isRemote = false;
//   let tempWordPath: string | null = null;
  
//   try {
//     // Check if it's a URL (Supabase) or local path
//     if (isUrl(wordFilePath)) {
//       isRemote = true;
      
//       // Download Word file from URL to temp location
//       tempWordPath = await downloadFile(wordFilePath, '.docx');
//       localWordPath = tempWordPath;
//     } else {
//       // Local file path
//       localWordPath = path.join(process.cwd(), wordFilePath);
//     }
    
//     console.log(`🔄 [Adobe] Converting DOCX to PDF: ${wordFilePath}`);
    
//     // Generate output path
//     const outputPath = localWordPath.replace(/\.docx?$/i, '.pdf');
    
//     // Use Adobe service for conversion
//     const pdfAbsolutePath = await adobeService.convertDocxToPdf(localWordPath, outputPath);
    
//     console.log(`✅ [Adobe] DOCX to PDF conversion successful`);
    
//     // Clean up temp files
//     if (tempWordPath) await fs.unlink(tempWordPath).catch(() => {});
    
//     // Convert absolute path to relative web path before returning
//     return convertToWebPath(pdfAbsolutePath);
//   } catch (error) {
//     // Clean up temp files on error
//     if (tempWordPath) await fs.unlink(tempWordPath).catch(() => {});
    
//     console.error('❌ [Adobe] DOCX to PDF conversion error:', error);
//     throw new Error(`Failed to convert DOCX to PDF: ${error}`);
//   }
// }

// /**
//  * Convert PDF to Word document using Adobe Services
//  * Handles both local paths and remote URLs (Supabase)
//  */
// export async function convertPdfToWord(
//   pdfFilePath: string
// ): Promise<string> {
//   let localPdfPath: string;
//   let isRemote = false;
//   let tempPdfPath: string | null = null;
  
//   try {
//     // Check if it's a URL (Supabase) or local path
//     if (isUrl(pdfFilePath)) {
//       isRemote = true;
      
//       // Download PDF file from URL to temp location
//       tempPdfPath = await downloadFile(pdfFilePath, '.pdf');
//       localPdfPath = tempPdfPath;
//     } else {
//       // Local file path
//       localPdfPath = path.join(process.cwd(), pdfFilePath);
//     }
    
//     console.log(`🔄 [Adobe] Converting PDF to DOCX: ${pdfFilePath}`);
    
//     // Generate output path
//     const outputPath = localPdfPath.replace(/\.pdf$/i, '.docx');
    
//     // Use Adobe service for conversion
//     const docxAbsolutePath = await adobeService.convertPdfToDocx(localPdfPath, outputPath);
    
//     console.log(`✅ [Adobe] PDF to DOCX conversion successful`);
    
//     // ✅ Add watermark to converted Word file using Adobe service
//     console.log(`🔖 [Adobe] Adding watermark to converted DOCX file...`);
//     try {
//       const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
//       const watermarkData = {
//         userName: 'LAW NATION',
//         downloadDate: new Date(),
//         articleTitle: 'Converted Document',
//         articleId: 'conversion',
//         frontendUrl,
//       };
      
//       const watermarkedOutputPath = docxAbsolutePath.replace('.docx', '_watermarked.docx');
//       // Pass absolute paths to watermark function, get absolute path back
//       const watermarkedAbsolutePath = await adobeService.addWatermarkToDocx(docxAbsolutePath, watermarkedOutputPath, watermarkData);
      
//       console.log(`✅ [Adobe] Watermark added to DOCX file`);
      
//       // Clean up temp files
//       if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => {});
      
//       // Convert absolute path to relative web path before returning
//       return convertToWebPath(watermarkedAbsolutePath);
//     } catch (watermarkError) {
//       console.warn(`⚠️ [Adobe] Failed to add watermark to DOCX file:`, watermarkError);
      
//       // Clean up temp files
//       if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => {});
      
//       // Return non-watermarked version if watermarking fails
//       return convertToWebPath(docxAbsolutePath);
//     }
//   } catch (error) {
//     // Clean up temp files on error
//     if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => {});
    
//     console.error('❌ [Adobe] PDF to DOCX conversion error:', error);
//     throw new Error(`Failed to convert PDF to DOCX: ${error}`);
//   }
// }

// /**
//  * Convert absolute file path to relative web path
//  */
// function convertToRelativePath(absolutePath: string): string {
//   const workspaceRoot = process.cwd();
  
//   // If it's already a relative web path (starts with /), return as is
//   if (absolutePath.startsWith('/') && !path.isAbsolute(absolutePath)) {
//     console.log(`🔄 [Path Convert] Already relative: ${absolutePath}`);
//     return absolutePath;
//   }
  
//   // If it's not an absolute path, return as is
//   if (!path.isAbsolute(absolutePath)) {
//     const webPath = '/' + absolutePath.replace(/\\/g, '/');
//     console.log(`🔄 [Path Convert] ${absolutePath} → ${webPath}`);
//     return webPath;
//   }
  
//   // Convert absolute path to relative path
//   const relativePath = path.relative(workspaceRoot, absolutePath);
  
//   // Convert Windows backslashes to forward slashes for web URLs
//   const webPath = '/' + relativePath.replace(/\\/g, '/');
  
//   console.log(`🔄 [Path Convert] ${absolutePath} → ${webPath}`);
//   return webPath;
// }

// /**
//  * Detect file type from extension
//  */
// export function getFileType(filePath: string): 'pdf' | 'docx' | 'unknown' {
//   const ext = path.extname(filePath).toLowerCase();
  
//   if (ext === '.pdf') return 'pdf';
//   if (ext === '.docx' || ext === '.doc') return 'docx';
//   return 'unknown';
// }

// /**
//  * Ensure both PDF and Word versions exist
//  * Converts the file if the other format doesn't exist
//  */
// export async function ensureBothFormats(
//   filePath: string
// ): Promise<{ pdfPath: string; wordPath: string }> {
//   const fileType = getFileType(filePath);
  
//   if (fileType === 'unknown') {
//     throw new Error(`Unknown file type: ${filePath}`);
//   }
  
//   let pdfPath: string;
//   let wordPath: string;
  
//   if (fileType === 'pdf') {
//     pdfPath = filePath;
//     wordPath = await convertPdfToWord(filePath);
//   } else {
//     wordPath = filePath;
//     pdfPath = await convertWordToPdf(filePath);
//   }
  
//   return { pdfPath, wordPath };
// }




import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { AdobeService } from '@/services/adobe.service.js';
import { convertToWebPath } from '@/utils/file-path.utils.js';

// Create require for CommonJS modules in ES module context
// No longer needed as we're using Adobe services

// Import docx-pdf (CommonJS module)
// No longer needed as we're using Adobe services

// Supabase client for uploading converted files (production only)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'Articles';
const NODE_ENV = process.env.NODE_ENV || 'development';

const supabase = SUPABASE_URL && SUPABASE_KEY && NODE_ENV === 'production'
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// Initialize Adobe service
const adobeService = new AdobeService();

/**
 * Check if we should use local storage (development) or cloud storage (production)
 */
function useLocalStorage(): boolean {
  return NODE_ENV === 'development' || NODE_ENV === 'local' || !supabase;
}

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
  
  // Create temp directory in uploads folder (served by Express)
  const tempDir = path.join(process.cwd(), 'uploads', 'temp');
  await fs.mkdir(tempDir, { recursive: true });
  
  const tempPath = path.join(tempDir, `temp-${Date.now()}${extension}`);
  await fs.writeFile(tempPath, Buffer.from(buffer));
  
  console.log(`✅ [Download] Saved to temp: ${tempPath}`);
  return tempPath;
}

/**
 * Save converted file locally (development) or upload to Supabase (production)
 */
async function saveConvertedFile(
  localFilePath: string,
  originalUrl: string,
  targetExtension: string
): Promise<string> {
  if (useLocalStorage()) {
    // Development: Save to local uploads directory
    console.log(`💾 [Local] Saving converted file locally`);
    
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const pdfsDir = path.join(uploadsDir, 'pdfs');
    const wordsDir = path.join(uploadsDir, 'words');
    
    // Ensure directories exist
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(pdfsDir, { recursive: true });
    await fs.mkdir(wordsDir, { recursive: true });
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.floor(Math.random() * 1000000);
    const fileName = `${timestamp}-${randomId}${targetExtension}`;
    
    const targetDir = targetExtension === '.pdf' ? pdfsDir : wordsDir;
    const targetPath = path.join(targetDir, fileName);
    
    // Copy converted file to uploads directory
    await fs.copyFile(localFilePath, targetPath);
    
    // Return relative path for local development
    const relativePath = `/uploads/${targetExtension === '.pdf' ? 'pdfs' : 'words'}/${fileName}`;
    console.log(`✅ [Local] Saved to: ${relativePath}`);
    
    return relativePath;
  } else {
    // Production: Upload to Supabase
    return await uploadToSupabase(localFilePath, originalUrl);
  }
}

/**
 * Upload file to Supabase storage (production only)
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
 * Convert Word document to PDF using Adobe Services
 * Handles both local paths and remote URLs (Supabase)
 */
export async function convertWordToPdf(
  wordFilePath: string
): Promise<string> {
  let localWordPath: string;
  let isRemote = false;
  let tempWordPath: string | null = null;
  
  try {
    // Check if it's a URL (Supabase) or local path
    if (isUrl(wordFilePath)) {
      isRemote = true;
      
      // Download Word file from URL to temp location
      tempWordPath = await downloadFile(wordFilePath, '.docx');
      localWordPath = tempWordPath;
    } else {
      // Local file path
      localWordPath = path.join(process.cwd(), wordFilePath);
    }
    
    console.log(`🔄 [Adobe] Converting DOCX to PDF: ${wordFilePath}`);
    
    // Generate output path
    const outputPath = localWordPath.replace(/\.docx?$/i, '.pdf');
    
    // Use Adobe service for conversion
    const pdfAbsolutePath = await adobeService.convertDocxToPdf(localWordPath, outputPath);
    
    console.log(`✅ [Adobe] DOCX to PDF conversion successful`);
    
    // Clean up temp files
    if (tempWordPath) await fs.unlink(tempWordPath).catch(() => {});
    
    // Convert absolute path to relative web path before returning
    return convertToWebPath(pdfAbsolutePath);
  } catch (error) {
    // Clean up temp files on error
    if (tempWordPath) await fs.unlink(tempWordPath).catch(() => {});
    
    console.error('❌ [Adobe] DOCX to PDF conversion error:', error);
    throw new Error(`Failed to convert DOCX to PDF: ${error}`);
  }
}

/**
 * Convert PDF to Word document using Adobe Services
 * Handles both local paths and remote URLs (Supabase)
 */
export async function convertPdfToWord(
  pdfFilePath: string
): Promise<string> {
  let localPdfPath: string;
  let isRemote = false;
  let tempPdfPath: string | null = null;
  
  try {
    // Check if it's a URL (Supabase) or local path
    if (isUrl(pdfFilePath)) {
      isRemote = true;
      
      // Download PDF file from URL to temp location
      tempPdfPath = await downloadFile(pdfFilePath, '.pdf');
      localPdfPath = tempPdfPath;
    } else {
      // Local file path
      localPdfPath = path.join(process.cwd(), pdfFilePath);
    }
    
    console.log(`🔄 [Adobe] Converting PDF to DOCX: ${pdfFilePath}`);
    
    // Generate output path
    const outputPath = localPdfPath.replace(/\.pdf$/i, '.docx');
    
    // Use Adobe service for conversion
    const docxAbsolutePath = await adobeService.convertPdfToDocx(localPdfPath, outputPath);
    
    console.log(`✅ [Adobe] PDF to DOCX conversion successful`);
    
    // ✅ Add watermark to converted Word file using Adobe service
    console.log(`🔖 [Adobe] Adding watermark to converted DOCX file...`);
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const watermarkData = {
        userName: 'LAW NATION',
        downloadDate: new Date(),
        articleTitle: 'Converted Document',
        articleId: 'conversion',
        frontendUrl,
      };
      
      const watermarkedOutputPath = docxAbsolutePath.replace('.docx', '_watermarked.docx');
      // Pass absolute paths to watermark function, get absolute path back
      const watermarkedAbsolutePath = await adobeService.addWatermarkToDocx(docxAbsolutePath, watermarkedOutputPath, watermarkData);
      
      console.log(`✅ [Adobe] Watermark added to DOCX file`);
      
      // Clean up temp files
      if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => {});
      
      // Convert absolute path to relative web path before returning
      return convertToWebPath(watermarkedAbsolutePath);
    } catch (watermarkError) {
      console.warn(`⚠️ [Adobe] Failed to add watermark to DOCX file:`, watermarkError);
      
      // Clean up temp files
      if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => {});
      
      // Return non-watermarked version if watermarking fails
      return convertToWebPath(docxAbsolutePath);
    }
  } catch (error) {
    // Clean up temp files on error
    if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => {});
    
    console.error('❌ [Adobe] PDF to DOCX conversion error:', error);
    throw new Error(`Failed to convert PDF to DOCX: ${error}`);
  }
}

/**
 * Convert absolute file path to relative web path
 */
function convertToRelativePath(absolutePath: string): string {
  const workspaceRoot = process.cwd();
  
  // If it's already a relative web path (starts with /), return as is
  if (absolutePath.startsWith('/') && !path.isAbsolute(absolutePath)) {
    console.log(`🔄 [Path Convert] Already relative: ${absolutePath}`);
    return absolutePath;
  }
  
  // If it's not an absolute path, return as is
  if (!path.isAbsolute(absolutePath)) {
    const webPath = '/' + absolutePath.replace(/\\/g, '/');
    console.log(`🔄 [Path Convert] ${absolutePath} → ${webPath}`);
    return webPath;
  }
  
  // Convert absolute path to relative path
  const relativePath = path.relative(workspaceRoot, absolutePath);
  
  // Convert Windows backslashes to forward slashes for web URLs
  const webPath = '/' + relativePath.replace(/\\/g, '/');
  
  console.log(`🔄 [Path Convert] ${absolutePath} → ${webPath}`);
  return webPath;
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
