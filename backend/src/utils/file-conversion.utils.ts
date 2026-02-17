// /src/utils/file-conversion.utils.ts
import fs from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AdobeService } from '@/services/adobe.service.js';

// S3 client for uploading converted files (matches upload.middleware.ts)
const isLocal = process.env.NODE_ENV === "local";
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const S3_BUCKET_ARTICLES = process.env.AWS_S3_BUCKET_ARTICLES || "law-nation";

const s3Client = !isLocal && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
  ? new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  })
  : null;

// Initialize Adobe service
const adobeService = new AdobeService();

/**
 * Check if we should use local storage (development) or S3 storage (production)
 */
function useLocalStorage(): boolean {
  return isLocal || !s3Client;
}

/**
 * Check if a path is a URL
 */
function isUrl(filePath: string): boolean {
  return filePath.startsWith('http://') || filePath.startsWith('https://');
}

/**
 * Download file from URL to temp location (with public S3 support)
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
 * Upload file to S3 storage (production only)
 */
export async function uploadToS3(
  localFilePath: string,
  originalUrl: string
): Promise<{ url: string; presignedUrl: string }> {
  if (!s3Client) {
    throw new Error('S3 client not initialized');
  }

  console.log(`☁️ [Upload] Uploading converted file to S3`);

  const fileBuffer = await fs.readFile(localFilePath);
  const extension = path.extname(localFilePath);

  // Generate unique filename
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 1000000);
  const fileName = `${timestamp}-${randomId}${extension}`;

  // Use articles folder for converted files
  const storageKey = `articles/${fileName}`;

  const contentType = extension === '.pdf'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET_ARTICLES,
    Key: storageKey,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Generate public URL
  const publicUrl = `https://${S3_BUCKET_ARTICLES}.s3.${AWS_REGION}.amazonaws.com/${storageKey}`;

  // 3. GENERATE VIP PASS (Presigned URL)
  const presignedUrl = await getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: S3_BUCKET_ARTICLES,
    Key: storageKey
  }), { expiresIn: 3600 }); // Valid for 1 hour

  console.log(`✅ [Upload] Uploaded to S3 (Secure): ${publicUrl}`);

  // Return BOTH URLs
  return { url: publicUrl, presignedUrl };
}

/**
 * Save converted file locally (development) or upload to S3 (production)
 */
async function saveConvertedFile(
  localFilePath: string,
  originalUrl: string,
  targetExtension: string
): Promise<{ url: string; presignedUrl?: string }> {
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
    // This matches the static route in app.ts: app.use("/uploads", ...)
    const relativePath = `/uploads/${targetExtension === '.pdf' ? 'pdfs' : 'words'}/${fileName}`;
    console.log(`✅ [Local] Saved to: ${relativePath}`);

    return { url: relativePath };
  } else {
    // Production: Upload to S3
    return await uploadToS3(localFilePath, originalUrl);
  }
}

/**
 * Convert Word document to PDF using Adobe Services
 * Handles both local paths and remote URLs (S3)
 */
export async function convertWordToPdf(
  wordFilePath: string
): Promise<{ url: string; presignedUrl?: string }> {
  let localWordPath: string;
  let isRemote = false;
  let tempWordPath: string | null = null;

  try {
    // Check if it's a URL (S3) or local path
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

    // Save the file via S3 (Prod) or Local Uploads (Dev)
    const result = await saveConvertedFile(
      pdfAbsolutePath,
      wordFilePath,
      '.pdf'
    );

    // Clean up temp files
    if (tempWordPath) await fs.unlink(tempWordPath).catch(() => { });

    // CORRECTED: Return the object directly
    return result;

  } catch (error) {
    // Clean up temp files on error
    if (tempWordPath) await fs.unlink(tempWordPath).catch(() => { });

    console.error('❌ [Adobe] DOCX to PDF conversion error:', error);
    throw new Error(`Failed to convert DOCX to PDF: ${error}`);
  }
}

/**
 * Convert PDF to Word document using Adobe Services
 * Handles both local paths and remote URLs (S3)
 */
export async function convertPdfToWord(
  pdfFilePath: string
): Promise<{ url: string; presignedUrl?: string }> {
  let localPdfPath: string;
  let isRemote = false;
  let tempPdfPath: string | null = null;

  try {
    // Check if it's a URL (S3) or local path
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

    let fileToUploadPath = docxAbsolutePath;

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
      fileToUploadPath = watermarkedAbsolutePath;

    } catch (watermarkError) {
      console.warn(`⚠️ [Adobe] Failed to add watermark to DOCX file:`, watermarkError);
      // Fallback to non-watermarked version
      fileToUploadPath = docxAbsolutePath;
    }

    // Save the file via S3 (Prod) or Local Uploads (Dev)
    const result = await saveConvertedFile(
      fileToUploadPath,
      pdfFilePath,
      '.docx'
    );

    // Clean up temp files
    if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => { });

    // CORRECTED: Return the object directly
    return result;

  } catch (error) {
    // Clean up temp files on error
    if (tempPdfPath) await fs.unlink(tempPdfPath).catch(() => { });

    console.error('❌ [Adobe] PDF to DOCX conversion error:', error);
    throw new Error(`Failed to convert PDF to DOCX: ${error}`);
  }
}

/**
 * Detect file type from extension
 */
export function getFileType(filePath: string): 'pdf' | 'docx' | 'unknown' {
  // 1. Remove query parameters (e.g., ?Signature=...) from Presigned URLs
  const cleanPath = filePath.split('?')[0];

  // 2. Get extension from the clean path
  const ext = path.extname(cleanPath).toLowerCase();

  if (ext === '.pdf') return 'pdf';
  if (ext === '.docx' || ext === '.doc') return 'docx';
  return 'unknown';
}

/**
 * Ensure both PDF and Word versions exist
 * Converts the file if the other format doesn't exist
 * Note: Returns URLs as strings to maintain backward compatibility with callers
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
    // CORRECTED: Extract 'url' from the object return
    const result = await convertPdfToWord(filePath);
    wordPath = result.url;
  } else {
    wordPath = filePath;
    // CORRECTED: Extract 'url' from the object return
    const result = await convertWordToPdf(filePath);
    pdfPath = result.url;
  }

  return { pdfPath, wordPath };
}