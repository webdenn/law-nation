import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { InternalServerError } from "../utils/http-errors.util.js";
import { resolveToAbsolutePath, fileExistsAtPath } from "@/utils/file-path.utils.js";
import { cleanWatermarkText, cleanTextForDatabase } from "@/utils/text-cleaning.utils.js";
import { loadCompanyLogo } from "@/utils/logo-loader.utils.js";
import AdmZip from "adm-zip";

// Adobe SDK types and classes
let AdobeSDK: any = null;
let ServicePrincipalCredentials: any = null;
let PDFServices: any = null;
let MimeType: any = null;
let ClientConfig: any = null;
let CreatePDFJob: any = null;
let CreatePDFResult: any = null;
let ExportPDFJob: any = null;
let ExportPDFResult: any = null;
let ExtractPDFJob: any = null;
let ExtractPDFResult: any = null;
let SDKError: any = null;
let ServiceUsageError: any = null;
let ServiceApiError: any = null;

// Initialize Adobe SDK
try {
  const adobeModule = await import("@adobe/pdfservices-node-sdk");
  AdobeSDK = adobeModule;
  ServicePrincipalCredentials = adobeModule.ServicePrincipalCredentials;
  PDFServices = adobeModule.PDFServices;
  MimeType = adobeModule.MimeType;
  ClientConfig = adobeModule.ClientConfig;
  CreatePDFJob = adobeModule.CreatePDFJob;
  CreatePDFResult = adobeModule.CreatePDFResult;
  ExportPDFJob = adobeModule.ExportPDFJob;
  ExportPDFResult = adobeModule.ExportPDFResult;
  ExtractPDFJob = adobeModule.ExtractPDFJob;
  ExtractPDFResult = adobeModule.ExtractPDFResult;
  SDKError = adobeModule.SDKError;
  ServiceUsageError = adobeModule.ServiceUsageError;
  ServiceApiError = adobeModule.ServiceApiError;

  console.log("✅ [Adobe] Adobe PDF Services SDK loaded successfully");
} catch (error) {
  console.warn("⚠️ [Adobe] Adobe PDF Services SDK not available:", error);
}

export class AdobeService {
  private pdfServices: any;
  private isAvailable: boolean;
  private initError: any = null;

  constructor() {
    this.isAvailable = false;

    console.log("🚀 [Adobe] Initializing Adobe PDF Services...");
    // Check env vars immediately
    const hasClientId = !!process.env.ADOBE_CLIENT_ID;
    const hasClientSecret = !!process.env.ADOBE_CLIENT_SECRET;
    const hasOrgId = !!process.env.ADOBE_ORGANIZATION_ID;

    if (!hasClientId || !hasClientSecret || !hasOrgId) {
      console.warn("⚠️ [Adobe] Missing credentials:");
      this.initError = "Missing environment variables";
      return;
    }

    try {
      if (!AdobeSDK || !ServicePrincipalCredentials || !PDFServices) {
        throw new Error("Adobe PDF Services SDK not loaded properly. Modules are missing.");
      }

      // Initialize Adobe PDF Services with credentials
      const credentials = new ServicePrincipalCredentials({
        clientId: process.env.ADOBE_CLIENT_ID!,
        clientSecret: process.env.ADOBE_CLIENT_SECRET!
      });

      // Configure timeout settings (60 seconds)
      let clientConfig;
      if (ClientConfig) {
        clientConfig = new ClientConfig({
          timeout: 60000,
        });
        console.log("⏱️ [Adobe] Client configuration applied with 60s timeout");
      }

      this.pdfServices = new PDFServices({ credentials, clientConfig });
      this.isAvailable = true;

      console.log("✅ [Adobe] Adobe PDF Services initialized successfully");
    } catch (error: any) {
      console.error("❌ [Adobe] Failed to initialize Adobe PDF Services:", error);
      this.isAvailable = false;
      this.initError = error.message || error;
    }
  }

  private checkAvailability(): void {
    if (!this.isAvailable) {
      console.error(`❌ [Adobe] Service unavailable due to: ${this.initError}`);
      throw new InternalServerError(`Adobe PDF Services not available: ${this.initError}`);
    }
  }

  /**
   * Convert absolute file path to relative web path
   */
  private convertToRelativePath(absolutePath: string): string {
    const workspaceRoot = process.cwd();
    if (!path.isAbsolute(absolutePath)) return absolutePath;
    const relativePath = path.relative(workspaceRoot, absolutePath);
    return '/' + relativePath.replace(/\\/g, '/');
  }

  /**
   * Convert PDF to DOCX using Adobe Services v4.1.0
   */
  async convertPdfToDocx(pdfPath: string, outputPath: string): Promise<string> {
    this.checkAvailability();

    let localPdfPath: string;
    let tempPdfPath: string | null = null;

    try {
      console.log(`🔄 [Adobe] Converting PDF to DOCX: ${pdfPath}`);

      if (this.isUrl(pdfPath)) {
        console.log(`🌐 [Adobe] URL detected, downloading file first...`);
        tempPdfPath = await this.downloadFile(pdfPath, '.pdf');
        localPdfPath = tempPdfPath;
      } else {
        localPdfPath = resolveToAbsolutePath(pdfPath);
      }

      const inputAsset = await this.pdfServices.upload({
        readStream: fs.createReadStream(localPdfPath),
        mimeType: MimeType.PDF
      });

      const ExportPDFParams = AdobeSDK.ExportPDFParams;
      const ExportPDFTargetFormat = AdobeSDK.ExportPDFTargetFormat;

      let params;
      if (ExportPDFParams && ExportPDFTargetFormat) {
        if (ExportPDFTargetFormat.DOCX) {
          params = new ExportPDFParams({ targetFormat: ExportPDFTargetFormat.DOCX });
        } else {
          params = new ExportPDFParams({ targetFormat: 'DOCX' });
        }
      } else {
        throw new InternalServerError('ExportPDFParams or ExportPDFTargetFormat not available');
      }

      const job = new ExportPDFJob({ inputAsset, params });
      const pollingURL = await this.pdfServices.submit({ job });
      const pdfServicesResponse = await this.pdfServices.getJobResult({
        pollingURL,
        resultType: ExportPDFResult
      });

      const resultAsset = pdfServicesResponse.result.asset;
      const streamAsset = await this.pdfServices.getContent({ asset: resultAsset });

      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputStream = fs.createWriteStream(outputPath);
      streamAsset.readStream.pipe(outputStream);

      return new Promise((resolve, reject) => {
        outputStream.on('finish', () => {
          if (tempPdfPath) fs.unlink(tempPdfPath, () => { });
          resolve(outputPath);
        });
        outputStream.on('error', (error) => {
          if (tempPdfPath) fs.unlink(tempPdfPath, () => { });
          reject(error);
        });
      });

    } catch (err: any) {
      if (tempPdfPath) fs.unlink(tempPdfPath, () => { });
      console.error('❌ [Adobe] PDF to DOCX conversion failed:', err);
      throw new InternalServerError(`Adobe PDF conversion failed: ${err.message}`);
    }
  }

  /**
   * Convert DOCX to PDF using Adobe Services
   */
  async convertDocxToPdf(docxPath: string, outputPath: string): Promise<string> {
    this.checkAvailability();

    let localDocxPath: string;
    let tempDocxPath: string | null = null;

    try {
      if (this.isUrl(docxPath)) {
        console.log(`🌐 [Adobe] URL detected, downloading file first...`);
        tempDocxPath = await this.downloadFile(docxPath, '.docx');
        localDocxPath = tempDocxPath;
      } else {
        localDocxPath = resolveToAbsolutePath(docxPath);
      }

      if (!fs.existsSync(localDocxPath)) {
        throw new InternalServerError(`Input DOCX file not found: ${localDocxPath}`);
      }

      const inputAsset = await this.pdfServices.upload({
        readStream: fs.createReadStream(localDocxPath),
        mimeType: MimeType.DOCX
      });

      const job = new CreatePDFJob({ inputAsset });
      const pollingURL = await this.pdfServices.submit({ job });
      const pdfServicesResponse = await this.pdfServices.getJobResult({
        pollingURL,
        resultType: CreatePDFResult
      });

      const resultAsset = pdfServicesResponse.result.asset;
      const streamAsset = await this.pdfServices.getContent({ asset: resultAsset });

      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputStream = fs.createWriteStream(outputPath);
      streamAsset.readStream.pipe(outputStream);

      return new Promise((resolve, reject) => {
        outputStream.on('finish', () => {
          if (tempDocxPath) fs.unlink(tempDocxPath, () => { });
          resolve(outputPath);
        });
        outputStream.on('error', (error) => {
          if (tempDocxPath) fs.unlink(tempDocxPath, () => { });
          reject(error);
        });
      });

    } catch (err: any) {
      if (tempDocxPath) fs.unlink(tempDocxPath, () => { });
      console.error(`❌ [Adobe] DOCX to PDF conversion failed: ${err.message}`);
      throw new InternalServerError('Adobe DOCX conversion failed');
    }
  }

  /**
   * ✅ IMPROVED: Download file from URL with comprehensive error handling and debugging
   */
  private async downloadFile(urlOrPath: string, extension: string): Promise<string> {
    console.log(`🌐 [Adobe Download] Starting download from URL: ${urlOrPath}`);

    try {
      // Step 1: URL encoding to handle spaces and special characters
      const encodedUrl = encodeURI(urlOrPath);
      console.log(`🔗 [Adobe Download] Encoded URL: ${encodedUrl}`);

      // Step 2: Make request with empty headers (no Authorization for public S3)
      console.log(`📡 [Adobe Download] Making HTTP request...`);
      const response = await fetch(encodedUrl, {
        method: 'GET',
        headers: {}, // Empty headers for public S3 access
      });

      console.log(`📊 [Adobe Download] Response status: ${response.status} ${response.statusText}`);
      console.log(`📊 [Adobe Download] Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Get response body for better error debugging
        let errorBody = '';
        try {
          errorBody = await response.text();
          console.error(`❌ [Adobe Download] Error response body: ${errorBody}`);
        } catch (bodyError) {
          console.error(`❌ [Adobe Download] Could not read error response body`);
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`);
      }

      // Step 3: Download file content
      console.log(`⬇️ [Adobe Download] Downloading file content...`);
      const buffer = await response.arrayBuffer();
      const fileSize = buffer.byteLength;
      console.log(`📊 [Adobe Download] Downloaded ${(fileSize / 1024).toFixed(2)} KB`);

      if (fileSize === 0) {
        throw new Error('Downloaded file is empty');
      }

      // Step 4: Create temp directory and file
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      console.log(`📁 [Adobe Download] Ensuring temp directory exists: ${tempDir}`);
      
      if (!fs.existsSync(tempDir)) {
        await fs.promises.mkdir(tempDir, { recursive: true });
        console.log(`✅ [Adobe Download] Created temp directory`);
      }

      // Generate unique temp filename
      const timestamp = Date.now();
      const randomId = Math.floor(Math.random() * 1000000);
      const tempFileName = `adobe-temp-${timestamp}-${randomId}${extension}`;
      const tempPath = path.join(tempDir, tempFileName);

      console.log(`💾 [Adobe Download] Saving to temp file: ${tempPath}`);

      // Step 5: Write file to disk
      await fs.promises.writeFile(tempPath, Buffer.from(buffer));

      // Step 6: Verify file was written correctly
      const savedStats = fs.statSync(tempPath);
      console.log(`✅ [Adobe Download] File saved successfully`);
      console.log(`   📊 Saved size: ${(savedStats.size / 1024).toFixed(2)} KB`);
      console.log(`   📂 Temp path: ${tempPath}`);

      if (savedStats.size !== fileSize) {
        throw new Error(`File size mismatch: downloaded ${fileSize} bytes, saved ${savedStats.size} bytes`);
      }

      // Step 7: Basic file validation for known types
      if (extension === '.pdf') {
        console.log(`🔍 [Adobe Download] Validating PDF file...`);
        const validation = await this.validatePdfFile(tempPath);
        if (!validation.isValid) {
          console.warn(`⚠️ [Adobe Download] Downloaded PDF validation failed: ${validation.error}`);
          // Don't throw error here, let the calling method handle it
        } else {
          console.log(`✅ [Adobe Download] Downloaded PDF is valid`);
        }
      }

      return tempPath;

    } catch (error: any) {
      console.error(`❌ [Adobe Download] Download failed: ${error.message}`);
      console.error(`   URL: ${urlOrPath}`);
      console.error(`   Error type: ${error.constructor.name}`);
      
      if (error.stack) {
        console.error(`   Stack trace: ${error.stack}`);
      }

      // Provide more specific error messages
      if (error.message.includes('fetch')) {
        throw new Error(`Network error downloading file: ${error.message}`);
      } else if (error.message.includes('HTTP 403') || error.message.includes('Forbidden')) {
        throw new Error(`Access denied downloading file: ${error.message}`);
      } else if (error.message.includes('HTTP 404') || error.message.includes('Not Found')) {
        throw new Error(`File not found at URL: ${error.message}`);
      } else {
        throw new Error(`Failed to download file: ${error.message}`);
      }
    }
  }

  private isUrl(filePath: string): boolean {
    return filePath.startsWith('http://') || filePath.startsWith('https://');
  }

  /**
   * ✅ IMPROVED: Validate PDF file with comprehensive checks
   */
  private async validatePdfFile(pdfPath: string): Promise<{ isValid: boolean; error?: string; canRepair?: boolean }> {
    console.log(`🔍 [PDF Validation] Validating PDF: ${pdfPath}`);
    
    try {
      const fs = await import('fs');
      const absolutePath = resolveToAbsolutePath(pdfPath);

      // Check if file exists
      if (!fs.existsSync(absolutePath)) {
        console.error(`❌ [PDF Validation] File not found: ${absolutePath}`);
        return { isValid: false, error: 'File not found' };
      }

      // Check file size
      const stats = fs.statSync(absolutePath);
      console.log(`📊 [PDF Validation] File size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      if (stats.size === 0) {
        console.error(`❌ [PDF Validation] Empty file`);
        return { isValid: false, error: 'Empty file' };
      }

      if (stats.size < 100) {
        console.error(`❌ [PDF Validation] File too small: ${stats.size} bytes`);
        return { isValid: false, error: 'File too small to be valid PDF' };
      }

      // Read first few bytes to check PDF header
      const fd = fs.openSync(absolutePath, 'r');
      const buffer = Buffer.alloc(10);
      fs.readSync(fd, buffer, 0, 10, 0);
      fs.closeSync(fd);
      const header = buffer.toString('ascii');

      console.log(`🔍 [PDF Validation] File header: ${header}`);

      if (!header.startsWith('%PDF-')) {
        console.error(`❌ [PDF Validation] Invalid PDF header: ${header}`);
        return { isValid: false, error: 'Invalid PDF header', canRepair: true };
      }

      // Try to load with pdf-lib for structure validation
      try {
        const { PDFDocument } = await import('pdf-lib');
        const pdfBytes = fs.readFileSync(absolutePath);
        
        console.log(`🔍 [PDF Validation] Loading PDF with pdf-lib...`);
        const pdfDoc = await PDFDocument.load(pdfBytes, {
          ignoreEncryption: true,
          throwOnInvalidObject: false
        });

        const pageCount = pdfDoc.getPageCount();
        console.log(`✅ [PDF Validation] PDF structure is valid: ${pageCount} pages`);
        return { isValid: true };
        
      } catch (pdfLibError: any) {
        console.warn(`⚠️ [PDF Validation] PDF structure issues: ${pdfLibError.message}`);
        return { 
          isValid: false, 
          error: `PDF structure corrupted: ${pdfLibError.message}`, 
          canRepair: true 
        };
      }

    } catch (error: any) {
      console.error(`❌ [PDF Validation] Validation failed: ${error.message}`);
      return { isValid: false, error: `Validation error: ${error.message}` };
    }
  }

  /**
   * ✅ IMPROVED: Repair corrupted PDF with better error handling
   */
  private async repairPdfFile(pdfPath: string, outputPath: string): Promise<boolean> {
    console.log(`🔧 [PDF Repair] Attempting to repair PDF: ${pdfPath}`);
    console.log(`   📂 Output: ${outputPath}`);

    try {
      const fs = await import('fs');
      const { PDFDocument } = await import('pdf-lib');

      const absoluteInputPath = resolveToAbsolutePath(pdfPath);
      const absoluteOutputPath = resolveToAbsolutePath(outputPath);

      console.log(`📖 [PDF Repair] Reading corrupted PDF...`);
      const pdfBytes = fs.readFileSync(absoluteInputPath);

      // Try different loading options with increasing tolerance
      const loadOptions = [
        { ignoreEncryption: true },
        { ignoreEncryption: true, parseSpeed: 0 },
        { ignoreEncryption: true, throwOnInvalidObject: false },
        { ignoreEncryption: true, throwOnInvalidObject: false, parseSpeed: 0 },
      ];

      for (let i = 0; i < loadOptions.length; i++) {
        const options = loadOptions[i];
        try {
          console.log(`🔧 [PDF Repair] Repair attempt ${i + 1}/${loadOptions.length} with options:`, options);
          
          const pdfDoc = await PDFDocument.load(pdfBytes, options);
          const pageCount = pdfDoc.getPageCount();
          console.log(`✅ [PDF Repair] Successfully loaded PDF with ${pageCount} pages`);

          // Re-save the PDF to fix structure
          console.log(`💾 [PDF Repair] Saving repaired PDF...`);
          const repairedBytes = await pdfDoc.save();

          // Ensure output directory exists
          const outputDir = path.dirname(absoluteOutputPath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          fs.writeFileSync(absoluteOutputPath, repairedBytes);

          // Validate the repaired PDF
          console.log(`🔍 [PDF Repair] Validating repaired PDF...`);
          const validation = await this.validatePdfFile(outputPath);
          
          if (validation.isValid) {
            const outputStats = fs.statSync(absoluteOutputPath);
            console.log(`✅ [PDF Repair] PDF successfully repaired!`);
            console.log(`   📊 Repaired size: ${(outputStats.size / 1024).toFixed(2)} KB`);
            console.log(`   🔧 Repair method: Option ${i + 1}`);
            return true;
          } else {
            console.warn(`⚠️ [PDF Repair] Repaired PDF still invalid: ${validation.error}`);
            // Try next option
            continue;
          }

        } catch (repairError: any) {
          console.warn(`⚠️ [PDF Repair] Attempt ${i + 1} failed: ${repairError.message}`);
          // Continue to next option
          continue;
        }
      }

      console.error(`❌ [PDF Repair] All repair attempts failed`);
      return false;

    } catch (error: any) {
      console.error(`❌ [PDF Repair] Repair process failed: ${error.message}`);
      return false;
    }
  }

  async extractTextFromPdf(pdfPath: string): Promise<string> {
    this.checkAvailability();
    let processingPath = pdfPath;
    let tempPath: string | null = null;
    let localPath: string;

    try {
      if (this.isUrl(pdfPath)) {
        tempPath = await this.downloadFile(pdfPath, '.pdf');
        localPath = tempPath;
        processingPath = localPath;
      } else {
        localPath = resolveToAbsolutePath(pdfPath);
        processingPath = localPath;
      }

      if (!fs.existsSync(localPath)) throw new Error(`Input file not found at: ${localPath}`);

      const validation = await this.validatePdfFile(localPath);
      if (!validation.isValid && validation.canRepair) {
        const repairedPath = localPath.replace(/\.pdf$/i, '_repaired.pdf');
        if (await this.repairPdfFile(localPath, repairedPath)) {
          processingPath = repairedPath;
        }
      }

      const inputAsset = await this.pdfServices.upload({
        readStream: fs.createReadStream(processingPath),
        mimeType: MimeType.PDF
      });

      const params = new AdobeSDK.ExtractPDFParams({
        elementsToExtract: [AdobeSDK.ExtractElementType.TEXT]
      });

      const job = new AdobeSDK.ExtractPDFJob({ inputAsset, params });
      const pollingURL = await this.pdfServices.submit({ job });
      const pdfServicesResponse = await this.pdfServices.getJobResult({ pollingURL, resultType: ExtractPDFResult });
      const streamAsset = await this.pdfServices.getContent({ asset: pdfServicesResponse.result.resource });

      return new Promise((resolve, reject) => {
        let chunks: any[] = [];
        streamAsset.readStream.on('data', (chunk: any) => chunks.push(chunk));
        streamAsset.readStream.on('end', async () => {
          try {
            const totalBuffer = Buffer.concat(chunks);
            if (totalBuffer.length > 0 && totalBuffer[0] === 0x50 && totalBuffer[1] === 0x4B) {
              const zip = new AdmZip(totalBuffer);
              const mainEntry = zip.getEntry('structuredData.json');
              if (mainEntry) {
                const json = JSON.parse(mainEntry.getData().toString('utf8'));
                const text = (json.elements || []).filter((e: any) => e.Text).map((e: any) => e.Text).join(' ');
                this.cleanupRepairedFile(processingPath, pdfPath);
                if (tempPath) fs.unlink(tempPath, () => { });
                return resolve(cleanTextForDatabase(text));
              }
            }
            const json = JSON.parse(totalBuffer.toString('utf8'));
            const text = (json.elements || []).filter((e: any) => e.Text).map((e: any) => e.Text).join(' ');
            this.cleanupRepairedFile(processingPath, pdfPath);
            if (tempPath) fs.unlink(tempPath, () => { });
            resolve(cleanTextForDatabase(text));
          } catch (e) {
            this.cleanupRepairedFile(processingPath, pdfPath);
            if (tempPath) fs.unlink(tempPath, () => { });
            resolve(await this.extractTextFromCorruptedPdf(pdfPath));
          }
        });
        streamAsset.readStream.on('error', (err: any) => {
          if (tempPath) fs.unlink(tempPath, () => { });
          reject(err);
        });
      });

    } catch (err: any) {
      this.cleanupRepairedFile(processingPath, pdfPath);
      if (tempPath) fs.unlink(tempPath, () => { });
      console.error('❌ [Adobe] Extract failed:', err.message);
      return await this.extractTextFromCorruptedPdf(pdfPath);
    }
  }

  private cleanupRepairedFile(processingPath: string, originalPath: string) {
    if (processingPath !== originalPath) {
      try {
        fs.unlinkSync(resolveToAbsolutePath(processingPath));
      } catch { }
    }
  }

  private async extractTextFromCorruptedPdf(pdfPath: string): Promise<string> {
    try {
      const pdfParse = require('pdf-parse');
      let dataBuffer;
      if (this.isUrl(pdfPath)) {
        // Use the same robust download logic here
        const encodedUrl = encodeURI(pdfPath);
        const res = await fetch(encodedUrl, { headers: {} });
        const arr = await res.arrayBuffer();
        dataBuffer = Buffer.from(arr);
      } else {
        dataBuffer = fs.readFileSync(resolveToAbsolutePath(pdfPath));
      }
      const data = await pdfParse(dataBuffer);
      return cleanTextForDatabase(data.text);
    } catch {
      return 'PDF corrupted/unreadable.';
    }
  }

  private async extractTextUsingOCR(pdfPath: string): Promise<string> {
    throw new Error('OCR extraction not implemented');
  }

  async extractTextFromDocxUsingMammoth(docxPath: string): Promise<string> {
    try {
      const mammoth = await import('mammoth');
      let localPath: string;
      let tempPath: string | null = null;

      if (this.isUrl(docxPath)) {
        tempPath = await this.downloadFile(docxPath, '.docx');
        localPath = tempPath;
      } else {
        localPath = resolveToAbsolutePath(docxPath);
      }

      if (!fs.existsSync(localPath)) throw new Error(`File not found: ${localPath}`);
      const result = await mammoth.extractRawText({ path: localPath });
      if (tempPath) fs.unlink(tempPath, () => { });
      return cleanTextForDatabase(result.value);
    } catch (error: any) {
      throw new InternalServerError(`Mammoth failed: ${error.message}`);
    }
  }

  async extractTextFromDocx(docxPath: string): Promise<string> {
    this.checkAvailability();
    try {
      let localPath: string;
      let tempPath: string | null = null;

      if (this.isUrl(docxPath)) {
        tempPath = await this.downloadFile(docxPath, '.docx');
        localPath = tempPath;
      } else {
        localPath = resolveToAbsolutePath(docxPath);
      }

      const inputAsset = await this.pdfServices.upload({
        readStream: fs.createReadStream(localPath),
        mimeType: MimeType.DOCX
      });

      const params = new AdobeSDK.ExtractPDFParams({
        elementsToExtract: [AdobeSDK.ExtractElementType.TEXT]
      });

      const job = new AdobeSDK.ExtractPDFJob({ inputAsset, params });
      const pollingURL = await this.pdfServices.submit({ job });
      const pdfServicesResponse = await this.pdfServices.getJobResult({ pollingURL, resultType: ExtractPDFResult });
      const streamAsset = await this.pdfServices.getContent({ asset: pdfServicesResponse.result.resource });

      return new Promise((resolve, reject) => {
        let jsonData = '';
        streamAsset.readStream.on('data', (chunk: any) => jsonData += chunk);
        streamAsset.readStream.on('end', () => {
          try {
            const extractedData = JSON.parse(jsonData);
            const text = (extractedData.elements || []).filter((e: any) => e.Text).map((e: any) => e.Text).join(' ');
            if (tempPath) fs.unlink(tempPath, () => { });
            resolve(cleanTextForDatabase(text));
          } catch (e) {
            if (tempPath) fs.unlink(tempPath, () => { });
            resolve(cleanTextForDatabase(jsonData)); // fallback raw
          }
        });
        streamAsset.readStream.on('error', (err: any) => {
          if (tempPath) fs.unlink(tempPath, () => { });
          reject(err);
        });
      });
    } catch (err: any) {
      console.error('❌ [Adobe] DOCX extract failed:', err);
      throw new InternalServerError('Adobe text extraction failed');
    }
  }

  async addWatermarkToDocx(docxPath: string, outputPath: string, watermarkData: any): Promise<string> {
    this.checkAvailability();
    try {
      let localPath: string;
      let tempPath: string | null = null;

      if (this.isUrl(docxPath)) {
        tempPath = await this.downloadFile(docxPath, '.docx');
        localPath = tempPath;
      } else {
        localPath = resolveToAbsolutePath(docxPath);
      }

      // Adobe SDK lacks direct DOCX watermarking, so we copy it
      fs.copyFileSync(localPath, outputPath);
      
      if (tempPath) fs.unlink(tempPath, () => { });
      return outputPath;
    } catch (err: any) {
      throw new InternalServerError('DOCX watermarking failed');
    }
  }

  /**
   * ✅ FIXED: Add watermark to PDF with comprehensive debugging and validation
   */
  async addWatermarkToPdf(pdfPath: string, outputPath: string, watermarkData: any): Promise<string> {
    console.log(`🔄 [Adobe Watermark] Starting PDF watermarking process`);
    console.log(`   📂 Input: ${pdfPath}`);
    console.log(`   📂 Output: ${outputPath}`);
    console.log(`   💧 Watermark data:`, {
      userName: watermarkData.userName,
      articleTitle: watermarkData.articleTitle,
      articleId: watermarkData.articleId
    });

    this.checkAvailability();

    let localPath: string;
    let tempPath: string | null = null;

    try {
      // Step 1: Handle URL downloads with improved error handling
      if (this.isUrl(pdfPath)) {
        console.log(`🌐 [Adobe Watermark] URL detected, downloading file first...`);
        tempPath = await this.downloadFile(pdfPath, '.pdf');
        localPath = tempPath;
        console.log(`✅ [Adobe Watermark] File downloaded to: ${localPath}`);
      } else {
        localPath = resolveToAbsolutePath(pdfPath);
        console.log(`💾 [Adobe Watermark] Using local file: ${localPath}`);
      }

      // Step 2: Validate file exists and is accessible
      if (!fs.existsSync(localPath)) {
        throw new Error(`PDF file not found at: ${localPath}`);
      }

      const fileStats = fs.statSync(localPath);
      console.log(`📊 [Adobe Watermark] File size: ${(fileStats.size / 1024).toFixed(2)} KB`);

      if (fileStats.size === 0) {
        throw new Error(`PDF file is empty: ${localPath}`);
      }

      // Step 3: Validate PDF structure before processing
      console.log(`🔍 [Adobe Watermark] Validating PDF structure...`);
      const validation = await this.validatePdfFile(localPath);
      
      if (!validation.isValid) {
        console.warn(`⚠️ [Adobe Watermark] PDF validation failed: ${validation.error}`);
        
        if (validation.canRepair) {
          console.log(`🔧 [Adobe Watermark] Attempting PDF repair...`);
          const repairedPath = localPath.replace(/\.pdf$/i, '_repaired_for_watermark.pdf');
          const repairSuccess = await this.repairPdfFile(localPath, repairedPath);
          
          if (repairSuccess) {
            console.log(`✅ [Adobe Watermark] PDF repaired successfully`);
            // Clean up original if it was a temp file
            if (tempPath && tempPath === localPath) {
              fs.unlink(localPath, () => {});
            }
            localPath = repairedPath;
            tempPath = repairedPath; // Mark for cleanup
          } else {
            console.warn(`⚠️ [Adobe Watermark] PDF repair failed, continuing with original`);
          }
        }
      } else {
        console.log(`✅ [Adobe Watermark] PDF structure is valid`);
      }

      // Step 4: Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        console.log(`📁 [Adobe Watermark] Creating output directory: ${outputDir}`);
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Step 5: Adobe validation (upload to verify PDF integrity)
      console.log(`🔍 [Adobe Watermark] Validating PDF through Adobe services...`);
      try {
        const inputAsset = await this.pdfServices.upload({
          readStream: fs.createReadStream(localPath),
          mimeType: MimeType.PDF
        });
        console.log(`✅ [Adobe Watermark] PDF validated by Adobe services`);
      } catch (adobeError: any) {
        console.error(`❌ [Adobe Watermark] Adobe validation failed: ${adobeError.message}`);
        throw new Error(`PDF rejected by Adobe services: ${adobeError.message}`);
      }

      // Step 6: Apply watermark using pdf-lib (more reliable than Adobe watermarking)
      console.log(`💧 [Adobe Watermark] Applying watermarks using pdf-lib...`);
      const { PDFDocument, rgb, StandardFonts, degrees } = await import('pdf-lib');

      // Load the PDF
      const pdfBytes = fs.readFileSync(localPath);
      const pdfDoc = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true,
        throwOnInvalidObject: false
      });

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Create watermark text
      const centerWatermarkText = `${watermarkData.userName} | ${new Date().toLocaleDateString()} | Article ID: ${watermarkData.articleId}`;
      const footerWatermarkText = `Downloaded from LAW NATION | ${new Date().toLocaleDateString()}`;

      // Apply watermarks to all pages
      const pages = pdfDoc.getPages();
      console.log(`📄 [Adobe Watermark] Processing ${pages.length} pages...`);

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = pages[pageIndex];
        if (!page) continue;

        const { width, height } = page.getSize();
        console.log(`📄 [Adobe Watermark] Page ${pageIndex + 1}: ${width}x${height}`);

        // Diagonal center watermark
        page.drawText(centerWatermarkText, {
          x: width / 2 - 150,
          y: height / 2 - 80,
          size: 12,
          font: font,
          color: rgb(0.8, 0.8, 0.8),
          rotate: degrees(-45),
          opacity: 0.3,
        });

        // Footer watermark
        page.drawText(footerWatermarkText, {
          x: 50,
          y: 30,
          size: 8,
          font: font,
          color: rgb(0.6, 0.6, 0.6),
          opacity: 0.7,
        });

        // Company logo text watermark
        page.drawText("LAW NATION", {
          x: width * 0.6 - 100,
          y: height * 0.6,
          size: 72,
          font: boldFont,
          color: rgb(0.85, 0.85, 0.85),
          opacity: 0.4,
        });

        console.log(`✅ [Adobe Watermark] Page ${pageIndex + 1} watermarked successfully`);
      }

      // Step 7: Save watermarked PDF with validation
      console.log(`💾 [Adobe Watermark] Saving watermarked PDF...`);
      const watermarkedBytes = await pdfDoc.save();

      // Validate the watermarked PDF before saving
      try {
        await PDFDocument.load(watermarkedBytes);
        console.log(`✅ [Adobe Watermark] Watermarked PDF validation passed`);
      } catch (validationError: any) {
        console.error(`❌ [Adobe Watermark] Watermarked PDF validation failed: ${validationError.message}`);
        throw new Error(`Watermarked PDF is corrupted: ${validationError.message}`);
      }

      // Save to output path
      fs.writeFileSync(outputPath, watermarkedBytes);

      // Verify output file was created successfully
      if (!fs.existsSync(outputPath)) {
        throw new Error(`Failed to create output file: ${outputPath}`);
      }

      const outputStats = fs.statSync(outputPath);
      console.log(`✅ [Adobe Watermark] PDF watermarking completed successfully`);
      console.log(`   📊 Output file size: ${(outputStats.size / 1024).toFixed(2)} KB`);
      console.log(`   💧 Watermark style: LAW NATION logo + PDF overlay watermarks`);
      console.log(`   🔧 Adobe validation: PDF integrity verified`);

      // Step 8: Clean up temp files
      if (tempPath) {
        console.log(`🧹 [Adobe Watermark] Cleaning up temp file: ${tempPath}`);
        fs.unlink(tempPath, (err) => {
          if (err) {
            console.warn(`⚠️ [Adobe Watermark] Failed to clean up temp file: ${err.message}`);
          } else {
            console.log(`✅ [Adobe Watermark] Temp file cleaned up successfully`);
          }
        });
      }

      return outputPath;

    } catch (err: any) {
      console.error(`❌ [Adobe Watermark] PDF watermarking failed: ${err.message}`);
      console.error(`   Error type: ${err.constructor.name}`);
      console.error(`   Stack trace: ${err.stack}`);

      // Clean up temp files on error
      if (tempPath) {
        console.log(`🧹 [Adobe Watermark] Cleaning up temp file after error: ${tempPath}`);
        fs.unlink(tempPath, () => {});
      }

      // Check if this is a specific Adobe/PDF error
      if (err.message && (
        err.message.includes('BAD_PDF') || 
        err.message.includes('Asset download URI') ||
        err.message.includes('PDF rejected by Adobe')
      )) {
        console.warn(`⚠️ [Adobe Watermark] PDF is corrupted or incompatible with Adobe services`);
        console.warn(`⚠️ [Adobe Watermark] Using fallback: copying clean PDF without watermark`);

        try {
          // Fallback: copy clean PDF without watermark to prevent corruption
          const sourceFile = this.isUrl(pdfPath) ? localPath : resolveToAbsolutePath(pdfPath);
          if (fs.existsSync(sourceFile)) {
            fs.copyFileSync(sourceFile, outputPath);
            console.log(`✅ [Adobe Watermark] Fallback: Clean PDF copied (no watermark to prevent corruption)`);
            return outputPath;
          }
        } catch (copyError: any) {
          console.error(`❌ [Adobe Watermark] Fallback copy also failed: ${copyError.message}`);
        }
      }

      throw new InternalServerError(`PDF watermarking failed: ${err.message}`);
    }
  }

  async testConnection(): Promise<any> {
    try {
      this.checkAvailability();
      return { success: true, message: "Adobe Services Available" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

export const adobeService = new AdobeService();
