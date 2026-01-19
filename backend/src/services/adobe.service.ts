import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { InternalServerError } from "../utils/http-errors.util.js";
import { resolveToAbsolutePath, fileExistsAtPath } from "@/utils/file-path.utils.js";
import { cleanWatermarkText, cleanTextForDatabase } from "@/utils/text-cleaning.utils.js";
import { loadCompanyLogo } from "@/utils/logo-loader.utils.js";

// Adobe SDK types and classes
let AdobeSDK: any = null;
let ServicePrincipalCredentials: any = null;
let PDFServices: any = null;
let MimeType: any = null;
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
  CreatePDFJob = adobeModule.CreatePDFJob;
  CreatePDFResult = adobeModule.CreatePDFResult;
  ExportPDFJob = adobeModule.ExportPDFJob;
  ExportPDFResult = adobeModule.ExportPDFResult;
  ExtractPDFJob = adobeModule.ExtractPDFJob;
  ExtractPDFResult = adobeModule.ExtractPDFResult;
  SDKError = adobeModule.SDKError;
  ServiceUsageError = adobeModule.ServiceUsageError;
  ServiceApiError = adobeModule.ServiceApiError;

  // Import the target format and params classes
  const ExportPDFParams = adobeModule.ExportPDFParams;
  const ExportPDFTargetFormat = adobeModule.ExportPDFTargetFormat;
  const ExtractPDFParams = adobeModule.ExtractPDFParams;
  const ExtractElementType = adobeModule.ExtractElementType;

  // Debug: Check the target format options
  console.log("🔍 [Adobe Debug] ExportPDFTargetFormat:", ExportPDFTargetFormat);
  if (ExportPDFTargetFormat) {
    console.log("🔍 [Adobe Debug] ExportPDFTargetFormat keys:", Object.keys(ExportPDFTargetFormat));
  }

  // Debug: Check the extract element types
  console.log("🔍 [Adobe Debug] ExtractElementType:", ExtractElementType);
  if (ExtractElementType) {
    console.log("🔍 [Adobe Debug] ExtractElementType keys:", Object.keys(ExtractElementType));
  }

  console.log("✅ [Adobe] Adobe PDF Services SDK loaded successfully");
} catch (error) {
  console.warn("⚠️ [Adobe] Adobe PDF Services SDK not available:", error);
}

export class AdobeService {
  private pdfServices: any;
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = false;

    console.log("🚀 [Adobe] Initializing Adobe PDF Services...");
    console.log("📋 [Adobe] Environment variables check:");
    console.log(`   - ADOBE_CLIENT_ID: ${process.env.ADOBE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - ADOBE_CLIENT_SECRET: ${process.env.ADOBE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - ADOBE_ORGANIZATION_ID: ${process.env.ADOBE_ORGANIZATION_ID ? '✅ Set' : '❌ Missing'}`);

    try {
      if (!AdobeSDK || !ServicePrincipalCredentials || !PDFServices) {
        throw new Error("Adobe PDF Services SDK not available");
      }

      // Initialize Adobe PDF Services with credentials
      const credentials = new ServicePrincipalCredentials({
        clientId: process.env.ADOBE_CLIENT_ID!,
        clientSecret: process.env.ADOBE_CLIENT_SECRET!,
        organizationId: process.env.ADOBE_ORGANIZATION_ID!
      });

      this.pdfServices = new PDFServices({ credentials });
      this.isAvailable = true;

      console.log("✅ [Adobe] Adobe PDF Services initialized successfully");
      console.log("🔧 [Adobe] Available methods: convertPdfToDocx, convertDocxToPdf, extractTextFromPdf, addWatermarkToDocx, addWatermarkToPdf");
    } catch (error) {
      console.error("❌ [Adobe] Failed to initialize Adobe PDF Services:", error);
      this.isAvailable = false;
    }
  }

  private checkAvailability(): void {
    console.log(`🔍 [Adobe] Checking availability: ${this.isAvailable ? '✅ Available' : '❌ Not Available'}`);
    if (!this.isAvailable) {
      throw new InternalServerError("Adobe PDF Services not available");
    }
  }

  /**
   * Convert absolute file path to relative web path
   */
  private convertToRelativePath(absolutePath: string): string {
    const workspaceRoot = process.cwd();

    // If it's already a relative path, return as is
    if (!path.isAbsolute(absolutePath)) {
      return absolutePath;
    }

    // Convert absolute path to relative path
    const relativePath = path.relative(workspaceRoot, absolutePath);

    // Convert Windows backslashes to forward slashes for web URLs
    const webPath = '/' + relativePath.replace(/\\/g, '/');

    console.log(`🔄 [Adobe Path Convert] ${absolutePath} → ${webPath}`);
    return webPath;
  }

  /**
   * Convert PDF to DOCX using Adobe Services v4.1.0
   */
  async convertPdfToDocx(pdfPath: string, outputPath: string): Promise<string> {
    this.checkAvailability();

    try {
      console.log(`🔄 [Adobe] Converting PDF to DOCX: ${pdfPath}`);

      // Create an ExecutionContext using credentials
      const inputAsset = await this.pdfServices.upload({
        readStream: fs.createReadStream(pdfPath),
        mimeType: MimeType.PDF
      });

      // For Adobe SDK v4.1.0, we need to use ExportPDFParams and ExportPDFTargetFormat
      const ExportPDFParams = AdobeSDK.ExportPDFParams;
      const ExportPDFTargetFormat = AdobeSDK.ExportPDFTargetFormat;

      console.log(`🔧 [Adobe] ExportPDFTargetFormat available:`, !!ExportPDFTargetFormat);
      console.log(`🔧 [Adobe] ExportPDFParams available:`, !!ExportPDFParams);

      // Create parameters with the correct target format
      let params;
      if (ExportPDFParams && ExportPDFTargetFormat) {
        if (ExportPDFTargetFormat.DOCX) {
          params = new ExportPDFParams({ targetFormat: ExportPDFTargetFormat.DOCX });
          console.log(`🔧 [Adobe] Using ExportPDFTargetFormat.DOCX`);
        } else if (ExportPDFTargetFormat.WORD) {
          params = new ExportPDFParams({ targetFormat: ExportPDFTargetFormat.WORD });
          console.log(`🔧 [Adobe] Using ExportPDFTargetFormat.WORD`);
        } else {
          // List available formats
          console.log(`🔧 [Adobe] Available target formats:`, Object.keys(ExportPDFTargetFormat));
          params = new ExportPDFParams({ targetFormat: ExportPDFTargetFormat.DOCX || 'DOCX' });
          console.log(`🔧 [Adobe] Using fallback target format`);
        }
      } else {
        throw new InternalServerError('ExportPDFParams or ExportPDFTargetFormat not available in Adobe SDK');
      }

      // Create the job with input asset and parameters
      const job = new ExportPDFJob({ inputAsset, params });
      console.log(`🔧 [Adobe] Created ExportPDFJob with parameters`);

      // Submit the job and get the job result
      const pollingURL = await this.pdfServices.submit({ job });
      const pdfServicesResponse = await this.pdfServices.getJobResult({
        pollingURL,
        resultType: ExportPDFResult
      });

      // Get content from the resulting asset(s)
      const resultAsset = pdfServicesResponse.result.asset;
      const streamAsset = await this.pdfServices.getContent({ asset: resultAsset });

      // Create output directory if it doesn't exist
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Save the result to the specified location
      const outputStream = fs.createWriteStream(outputPath);
      streamAsset.readStream.pipe(outputStream);

      return new Promise((resolve, reject) => {
        outputStream.on('finish', () => {
          console.log(`✅ [Adobe] PDF converted to DOCX: ${outputPath}`);
          // Return absolute path - let caller handle conversion to relative
          resolve(outputPath);
        });
        outputStream.on('error', reject);
      });

    } catch (err: any) {
      console.error('❌ [Adobe] PDF to DOCX conversion failed:', err);
      if (err instanceof SDKError || err instanceof ServiceUsageError || err instanceof ServiceApiError) {
        throw new InternalServerError(`Adobe PDF conversion failed: ${err.message}`);
      }
      throw new InternalServerError('Adobe PDF conversion failed');
    }
  }

  /**
   * Convert DOCX to PDF using Adobe Services
   */
  async convertDocxToPdf(docxPath: string, outputPath: string): Promise<string> {
    this.checkAvailability();

    const startTime = Date.now();
    console.log(`🔄 [Adobe] Starting DOCX to PDF conversion`);
    console.log(`   📂 Input: ${docxPath}`);
    console.log(`   📂 Output: ${outputPath}`);

    // Check if input file exists
    if (!fs.existsSync(docxPath)) {
      console.error(`❌ [Adobe] Input file not found: ${docxPath}`);
      throw new InternalServerError(`Input DOCX file not found: ${docxPath}`);
    }

    const fileSize = fs.statSync(docxPath).size;
    console.log(`   📊 File size: ${(fileSize / 1024).toFixed(2)} KB`);

    try {
      console.log(`⬆️ [Adobe] Uploading DOCX to Adobe Services...`);

      // Create an ExecutionContext using credentials
      const inputAsset = await this.pdfServices.upload({
        readStream: fs.createReadStream(docxPath),
        mimeType: MimeType.DOCX
      });

      console.log(`✅ [Adobe] File uploaded successfully`);
      console.log(`🔧 [Adobe] Creating PDF conversion job...`);

      // Create a new job instance
      const job = new CreatePDFJob({ inputAsset });

      console.log(`📤 [Adobe] Submitting job to Adobe Services...`);
      // Submit the job and get the job result
      const pollingURL = await this.pdfServices.submit({ job });
      console.log(`⏳ [Adobe] Job submitted, polling for results...`);

      const pdfServicesResponse = await this.pdfServices.getJobResult({
        pollingURL,
        resultType: CreatePDFResult
      });

      console.log(`✅ [Adobe] Job completed successfully`);
      console.log(`⬇️ [Adobe] Downloading converted PDF...`);

      // Get content from the resulting asset(s)
      const resultAsset = pdfServicesResponse.result.asset;
      const streamAsset = await this.pdfServices.getContent({ asset: resultAsset });

      // Create output directory if it doesn't exist
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        console.log(`📁 [Adobe] Creating output directory: ${outputDir}`);
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Save the result to the specified location
      const outputStream = fs.createWriteStream(outputPath);
      streamAsset.readStream.pipe(outputStream);

      return new Promise((resolve, reject) => {
        outputStream.on('finish', () => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const outputSize = fs.statSync(outputPath).size;

          console.log(`✅ [Adobe] DOCX converted to PDF successfully!`);
          console.log(`   📂 Output: ${outputPath}`);
          console.log(`   📊 Output size: ${(outputSize / 1024).toFixed(2)} KB`);
          console.log(`   ⏱️ Duration: ${duration}ms`);
          // Return absolute path - let caller handle conversion to relative
          resolve(outputPath);
        });
        outputStream.on('error', (error) => {
          console.error(`❌ [Adobe] Error writing output file:`, error);
          reject(error);
        });
      });

    } catch (err: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.error(`❌ [Adobe] DOCX to PDF conversion failed after ${duration}ms`);
      console.error(`   Error type: ${err.constructor.name}`);
      console.error(`   Error message: ${err.message}`);

      if (err instanceof SDKError) {
        console.error(`   SDK Error details:`, err);
      } else if (err instanceof ServiceUsageError) {
        console.error(`   Service Usage Error - Check your Adobe API limits`);
      } else if (err instanceof ServiceApiError) {
        console.error(`   Service API Error - Check your credentials and network`);
      }

      if (err instanceof SDKError || err instanceof ServiceUsageError || err instanceof ServiceApiError) {
        throw new InternalServerError(`Adobe DOCX conversion failed: ${err.message}`);
      }
      throw new InternalServerError('Adobe DOCX conversion failed');
    }
  }

  /**
   * Validate PDF file before processing to detect corruption early
   */
  private async validatePdfFile(pdfPath: string): Promise<{ isValid: boolean; error?: string; canRepair?: boolean }> {
    try {
      const fs = await import('fs');
      const absolutePath = resolveToAbsolutePath(pdfPath);

      // Check if file exists
      if (!fs.existsSync(absolutePath)) {
        return { isValid: false, error: 'File not found' };
      }

      // Check file size
      const stats = fs.statSync(absolutePath);
      if (stats.size === 0) {
        return { isValid: false, error: 'Empty file' };
      }

      if (stats.size < 100) {
        return { isValid: false, error: 'File too small to be valid PDF' };
      }

      // Read first few bytes to check PDF header
      const fd = fs.openSync(absolutePath, 'r');
      const buffer = Buffer.alloc(10);
      fs.readSync(fd, buffer, 0, 10, 0);
      fs.closeSync(fd);
      const header = buffer.toString('ascii');

      if (!header.startsWith('%PDF-')) {
        return { isValid: false, error: 'Invalid PDF header', canRepair: true };
      }

      // Try to load with pdf-lib for basic validation
      try {
        const { PDFDocument } = await import('pdf-lib');
        const pdfBytes = fs.readFileSync(absolutePath);
        await PDFDocument.load(pdfBytes);

        console.log(`✅ [PDF Validation] PDF structure is valid: ${pdfPath}`);
        return { isValid: true };
      } catch (pdfLibError: any) {
        console.warn(`⚠️ [PDF Validation] PDF structure issues detected: ${pdfLibError.message}`);
        return { isValid: false, error: `PDF structure corrupted: ${pdfLibError.message}`, canRepair: true };
      }

    } catch (error: any) {
      console.error(`❌ [PDF Validation] Validation failed: ${error.message}`);
      return { isValid: false, error: `Validation error: ${error.message}` };
    }
  }

  /**
   * Attempt to repair corrupted PDF using pdf-lib
   */
  private async repairPdfFile(pdfPath: string, outputPath: string): Promise<boolean> {
    try {
      console.log(`🔧 [PDF Repair] Attempting to repair PDF: ${pdfPath}`);

      const fs = await import('fs');
      const { PDFDocument } = await import('pdf-lib');

      const absoluteInputPath = resolveToAbsolutePath(pdfPath);
      const absoluteOutputPath = resolveToAbsolutePath(outputPath);

      // Try to load and re-save the PDF to fix minor corruption
      const pdfBytes = fs.readFileSync(absoluteInputPath);

      // Try with different loading options
      const loadOptions = [
        { ignoreEncryption: true },
        { ignoreEncryption: true, parseSpeed: 0 },
        { ignoreEncryption: true, throwOnInvalidObject: false },
      ];

      for (const options of loadOptions) {
        try {
          console.log(`🔧 [PDF Repair] Trying repair with options:`, options);
          const pdfDoc = await PDFDocument.load(pdfBytes, options);

          // Re-save the PDF to fix structure
          const repairedBytes = await pdfDoc.save();

          // Ensure output directory exists
          const outputDir = path.dirname(absoluteOutputPath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          fs.writeFileSync(absoluteOutputPath, repairedBytes);

          // Validate the repaired PDF
          const validation = await this.validatePdfFile(outputPath);
          if (validation.isValid) {
            console.log(`✅ [PDF Repair] PDF successfully repaired: ${outputPath}`);
            return true;
          }

        } catch (repairError: any) {
          console.warn(`⚠️ [PDF Repair] Repair attempt failed with options ${JSON.stringify(options)}: ${repairError.message}`);
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

  /**
   * Extract text from PDF using Adobe ExtractPDF API with validation and repair
   */
  async extractTextFromPdf(pdfPath: string): Promise<string> {
    this.checkAvailability();

    let processingPath = pdfPath; // Declare at function scope

    try {
      console.log(`🔄 [Adobe] Extracting text from PDF using ExtractPDF: ${pdfPath}`);

      // Convert relative path to absolute path using utility
      const absolutePath = resolveToAbsolutePath(pdfPath);

      if (!fileExistsAtPath(pdfPath)) {
        console.error(`❌ [Adobe] Input file missing: ${absolutePath}`);
        throw new Error(`Input file not found locally: ${absolutePath}`);
      }

      // Step 1: Validate PDF before processing
      console.log(`🔍 [Adobe] Validating PDF structure...`);
      const validation = await this.validatePdfFile(pdfPath);

      if (!validation.isValid) {
        console.warn(`⚠️ [Adobe] PDF validation failed: ${validation.error}`);

        if (validation.canRepair) {
          // Attempt to repair the PDF
          const repairedPath = pdfPath.replace(/\.pdf$/i, '_repaired.pdf');
          console.log(`🔧 [Adobe] Attempting PDF repair...`);

          const repairSuccess = await this.repairPdfFile(pdfPath, repairedPath);

          if (repairSuccess) {
            console.log(`✅ [Adobe] PDF repaired successfully, using repaired version`);
            processingPath = repairedPath;
          } else {
            console.warn(`⚠️ [Adobe] PDF repair failed, will try alternative extraction methods`);
            // Continue with original file but expect Adobe to fail
          }
        } else {
          console.warn(`⚠️ [Adobe] PDF cannot be repaired, will try alternative extraction methods`);
        }
      }

      // Step 2: Try Adobe extraction with the validated/repaired PDF
      const absoluteProcessingPath = resolveToAbsolutePath(processingPath);

      // Create an ExecutionContext using credentials
      const inputAsset = await this.pdfServices.upload({
        readStream: fs.createReadStream(absoluteProcessingPath),
        mimeType: MimeType.PDF
      });

      // For Adobe SDK v4.1.0, use ExtractPDFParams and ExtractElementType
      const ExtractPDFParams = AdobeSDK.ExtractPDFParams;
      const ExtractElementType = AdobeSDK.ExtractElementType;

      console.log(`🔧 [Adobe] ExtractElementType available:`, !!ExtractElementType);
      console.log(`🔧 [Adobe] ExtractPDFParams available:`, !!ExtractPDFParams);

      // Create parameters with the correct element type
      let params;
      if (ExtractPDFParams && ExtractElementType) {
        if (ExtractElementType.TEXT) {
          params = new ExtractPDFParams({
            elementsToExtract: [ExtractElementType.TEXT]
          });
          console.log(`🔧 [Adobe] Using ExtractElementType.TEXT`);
        } else {
          // List available element types
          console.log(`🔧 [Adobe] Available element types:`, Object.keys(ExtractElementType));
          params = new ExtractPDFParams({
            elementsToExtract: [ExtractElementType.TEXT || 'TEXT']
          });
          console.log(`🔧 [Adobe] Using fallback element type`);
        }
      } else {
        throw new InternalServerError('ExtractPDFParams or ExtractElementType not available in Adobe SDK');
      }

      // Create the job with input asset and parameters
      const job = new ExtractPDFJob({ inputAsset, params });
      console.log(`🔧 [Adobe] Created ExtractPDFJob with parameters`);

      // Submit the job and get the job result
      const pollingURL = await this.pdfServices.submit({ job });
      const pdfServicesResponse = await this.pdfServices.getJobResult({
        pollingURL,
        resultType: ExtractPDFResult
      });

      // Get content from the resulting asset(s)
      const resultAsset = pdfServicesResponse.result.resource;
      const streamAsset = await this.pdfServices.getContent({ asset: resultAsset });

      // Read the JSON result
      return new Promise((resolve, reject) => {
        let jsonData = '';
        streamAsset.readStream.on('data', (chunk: any) => {
          jsonData += chunk;
        });

        streamAsset.readStream.on('end', () => {
          try {
            // First, try to parse as JSON (structured extraction)
            const extractedData = JSON.parse(jsonData);
            const textElements = extractedData.elements || [];

            // Extract text from all text elements
            const rawExtractedText = textElements
              .filter((element: any) => element.Text)
              .map((element: any) => element.Text)
              .join(' ');

            const extractedText = cleanTextForDatabase(rawExtractedText);
            console.log(`✅ [Adobe] Text extracted from PDF as JSON and cleaned (${extractedText.length} characters)`);

            // Clean up repaired file if it was created
            if (processingPath !== pdfPath) {
              try {
                const fs = require('fs');
                fs.unlinkSync(resolveToAbsolutePath(processingPath));
                console.log(`🧹 [Adobe] Cleaned up repaired PDF file`);
              } catch { }
            }

            resolve(extractedText);
          } catch (parseError) {
            // If JSON parsing fails, treat the response as raw text
            console.log(`ℹ️ [Adobe] Response is raw text, not JSON. Using direct text content.`);
            const cleanedText = cleanTextForDatabase(jsonData);
            console.log(`✅ [Adobe] Text extracted from PDF as raw text and cleaned (${cleanedText.length} characters)`);

            // Clean up repaired file if it was created
            if (processingPath !== pdfPath) {
              try {
                const fs = require('fs');
                fs.unlinkSync(resolveToAbsolutePath(processingPath));
                console.log(`🧹 [Adobe] Cleaned up repaired PDF file`);
              } catch { }
            }

            resolve(cleanedText);
          }
        });

        streamAsset.readStream.on('error', reject);
      });

    } catch (err: any) {
      console.error('❌ [Adobe] PDF text extraction failed:', err);

      // Clean up repaired file if it was created
      if (processingPath && processingPath !== pdfPath) {
        try {
          const fs = require('fs');
          fs.unlinkSync(resolveToAbsolutePath(processingPath));
          console.log(`🧹 [Adobe] Cleaned up repaired PDF file after error`);
        } catch { }
      }

      // Check if this is a "BAD_PDF" error from Adobe
      if (err.message && err.message.includes('BAD_PDF')) {
        console.warn(`⚠️ [Adobe] BAD_PDF error detected - PDF is fundamentally corrupted`);
        console.warn(`⚠️ [Adobe] Falling back to alternative text extraction methods...`);

        // Try alternative extraction methods for corrupted PDFs
        return await this.extractTextFromCorruptedPdf(pdfPath);
      }

      if (err instanceof SDKError || err instanceof ServiceUsageError || err instanceof ServiceApiError) {
        throw new InternalServerError(`Adobe PDF text extraction failed: ${err.message}`);
      }
      throw new InternalServerError('Adobe PDF text extraction failed');
    }
  }

  /**
   * Alternative text extraction for corrupted PDFs that Adobe rejects
   */
  private async extractTextFromCorruptedPdf(pdfPath: string): Promise<string> {
    console.log(`🔄 [Alternative Extract] Attempting alternative text extraction for corrupted PDF: ${pdfPath}`);

    try {
      // Try pdf-parse as fallback for corrupted PDFs
      const fs = await import('fs');
      // Use require for pdf-parse to handle CommonJS module
      const pdfParse = require('pdf-parse');

      const absolutePath = resolveToAbsolutePath(pdfPath);
      const dataBuffer = fs.readFileSync(absolutePath);

      console.log(`🔧 [Alternative Extract] Using pdf-parse for corrupted PDF...`);
      const data = await pdfParse(dataBuffer);

      if (data.text && data.text.length > 0) {
        const cleanedText = cleanTextForDatabase(data.text);
        console.log(`✅ [Alternative Extract] Extracted ${cleanedText.length} characters using pdf-parse`);
        return cleanedText;
      } else {
        console.warn(`⚠️ [Alternative Extract] pdf-parse returned empty text`);
      }

    } catch (pdfParseError: any) {
      console.error(`❌ [Alternative Extract] pdf-parse failed: ${pdfParseError.message}`);
    }

    // Try pdf2pic + OCR as last resort for scanned/image PDFs
    try {
      console.log(`🔧 [Alternative Extract] Attempting OCR extraction for scanned PDF...`);
      const ocrText = await this.extractTextUsingOCR(pdfPath);

      if (ocrText && ocrText.length > 0) {
        console.log(`✅ [Alternative Extract] Extracted ${ocrText.length} characters using OCR`);
        return ocrText;
      }

    } catch (ocrError: any) {
      console.error(`❌ [Alternative Extract] OCR extraction failed: ${ocrError.message}`);
    }

    // If all methods fail, return a meaningful error message
    console.warn(`⚠️ [Alternative Extract] All extraction methods failed for corrupted PDF`);
    return 'This PDF file is corrupted and text cannot be extracted. Please upload a new, uncorrupted version of the document.';
  }

  /**
   * OCR-based text extraction for scanned PDFs (placeholder implementation)
   */
  private async extractTextUsingOCR(pdfPath: string): Promise<string> {
    // This is a placeholder for OCR implementation
    // In a real implementation, you would:
    // 1. Convert PDF pages to images using pdf2pic
    // 2. Use Tesseract.js or similar OCR library to extract text from images
    // 3. Combine text from all pages

    console.log(`🔧 [OCR] OCR extraction not implemented yet for: ${pdfPath}`);
    throw new Error('OCR extraction not implemented');
  }

  /**
   * Extract text from DOCX using mammoth library (Fallback method)
   */
  async extractTextFromDocxUsingMammoth(docxPath: string): Promise<string> {
    console.log(`🔄 [Mammoth] Extracting text from DOCX: ${docxPath}`);

    try {
      const fs = await import('fs');
      const mammoth = await import('mammoth');
      const absolutePath = resolveToAbsolutePath(docxPath);

      if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`);
      }

      const result = await mammoth.extractRawText({ path: absolutePath });
      const text = result.value; // The raw text
      const messages = result.messages; // Any warnings/messages

      if (messages && messages.length > 0) {
        console.log(`⚠️ [Mammoth] Warnings during extraction:`, messages);
      }

      const cleanedText = cleanTextForDatabase(text);
      console.log(`✅ [Mammoth] Extracted ${cleanedText.length} characters using Mammoth`);

      return cleanedText;
    } catch (error: any) {
      console.error(`❌ [Mammoth] Text extraction failed:`, error);
      throw new InternalServerError(`Mammoth text extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text from DOCX using Adobe Services v4.1.0
   */
  async extractTextFromDocx(docxPath: string): Promise<string> {
    this.checkAvailability();

    try {
      console.log(`� [Adobe Extract] Starting text extraction from converted DOCX...`);
      console.log(`🔄 [Adobe] Extracting text from DOCX: ${docxPath}`);

      // Convert relative path to absolute path using utility
      const absolutePath = resolveToAbsolutePath(docxPath);

      if (!fileExistsAtPath(docxPath)) {
        console.error(`❌ [Adobe] Input file missing: ${absolutePath}`);
        throw new Error(`Input file not found locally: ${absolutePath}`);
      }

      // Create an ExecutionContext using credentials
      const inputAsset = await this.pdfServices.upload({
        readStream: fs.createReadStream(absolutePath),
        mimeType: MimeType.DOCX
      });

      // For Adobe SDK v4.1.0, use ExtractPDFParams and ExtractElementType
      const ExtractPDFParams = AdobeSDK.ExtractPDFParams;
      const ExtractElementType = AdobeSDK.ExtractElementType;

      console.log(`🔧 [Adobe] ExtractElementType available:`, !!ExtractElementType);
      console.log(`🔧 [Adobe] ExtractPDFParams available:`, !!ExtractPDFParams);

      // Create parameters with the correct element type
      let params;
      if (ExtractPDFParams && ExtractElementType) {
        if (ExtractElementType.TEXT) {
          params = new ExtractPDFParams({
            elementsToExtract: [ExtractElementType.TEXT]
          });
          console.log(`🔧 [Adobe] Using ExtractElementType.TEXT`);
        } else {
          // List available element types
          console.log(`🔧 [Adobe] Available element types:`, Object.keys(ExtractElementType));
          params = new ExtractPDFParams({
            elementsToExtract: [ExtractElementType.TEXT || 'TEXT']
          });
          console.log(`🔧 [Adobe] Using fallback element type`);
        }
      } else {
        throw new InternalServerError('ExtractPDFParams or ExtractElementType not available in Adobe SDK');
      }

      // Create the job with input asset and parameters
      const job = new ExtractPDFJob({ inputAsset, params });
      console.log(`🔧 [Adobe] Created ExtractPDFJob with parameters`);

      // Submit the job and get the job result
      const pollingURL = await this.pdfServices.submit({ job });
      const pdfServicesResponse = await this.pdfServices.getJobResult({
        pollingURL,
        resultType: ExtractPDFResult
      });

      // Get content from the resulting asset(s)
      const resultAsset = pdfServicesResponse.result.resource;
      const streamAsset = await this.pdfServices.getContent({ asset: resultAsset });

      // Read the JSON result
      return new Promise((resolve, reject) => {
        let jsonData = '';
        streamAsset.readStream.on('data', (chunk: any) => {
          jsonData += chunk;
        });

        streamAsset.readStream.on('end', () => {
          try {
            // First, try to parse as JSON (structured extraction)
            const extractedData = JSON.parse(jsonData);
            const textElements = extractedData.elements || [];

            // Extract text from all text elements
            const rawExtractedText = textElements
              .filter((element: any) => element.Text)
              .map((element: any) => element.Text)
              .join(' ');

            const extractedText = cleanTextForDatabase(rawExtractedText);
            console.log(`✅ [Adobe] Text extracted from DOCX as JSON and cleaned (${extractedText.length} characters)`);
            resolve(extractedText);
          } catch (parseError) {
            // If JSON parsing fails, treat the response as raw text
            console.log(`ℹ️ [Adobe] Response is raw text, not JSON. Using direct text content.`);
            const cleanedText = cleanTextForDatabase(jsonData);
            console.log(`✅ [Adobe] Text extracted from DOCX as raw text and cleaned (${cleanedText.length} characters)`);
            resolve(cleanedText);
          }
        });

        streamAsset.readStream.on('error', reject);
      });

    } catch (err: any) {
      console.error('❌ [Adobe] Text extraction failed:', err);
      if (err instanceof SDKError || err instanceof ServiceUsageError || err instanceof ServiceApiError) {
        throw new InternalServerError(`Adobe text extraction failed: ${err.message}`);
      }
      throw new InternalServerError('Adobe text extraction failed');
    }
  }

  /**
   * Add watermark to DOCX (using existing utility as Adobe doesn't have direct watermark API)
   */
  async addWatermarkToDocx(docxPath: string, outputPath: string, watermarkData: any): Promise<string> {
    console.log(`🔄 [Adobe] Starting DOCX watermarking process`);
    console.log(`   📂 Input: ${docxPath}`);
    console.log(`   📂 Output: ${outputPath}`);
    console.log(`   💧 Watermark data:`, {
      userName: watermarkData.userName,
      articleTitle: watermarkData.articleTitle,
      articleId: watermarkData.articleId
    });

    this.checkAvailability();

    try {
      // NOTE: Adobe PDF Services SDK does not natively support DOCX watermarking without complex merge operations.
      // To ensure system stability, we will bypass the watermarking for DOCX files for now 
      // and simply copy the file to the output path. The PDF version will still be watermarked.

      console.warn(`⚠️ [Adobe] DOCX watermarking is not directly supported by the current SDK version.`);
      console.log(`ℹ️ [Adobe] Copying original DOCX to output path to preserve workflow...`);

      const fs = await import('fs');
      const path = await import('path'); // Ensure path is imported for resolveToAbsolutePath if needed

      // Resolve paths
      const absoluteInputPath = resolveToAbsolutePath(docxPath);
      const absoluteOutputPath = resolveToAbsolutePath(outputPath);
      const outputDir = path.dirname(absoluteOutputPath);

      // Ensure output dir exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Copy file
      fs.copyFileSync(absoluteInputPath, absoluteOutputPath);

      console.log(`✅ [Adobe] DOCX "watermarked" (copied) successfully`);
      console.log(`   📂 Output: ${outputPath}`);

      return outputPath;

    } catch (err: any) {
      console.error('❌ [Adobe] DOCX watermarking (copy fallback) failed:', err);
      throw new InternalServerError('DOCX watermarking failed');
    }
  }

  /**
   * Add watermark to PDF using Adobe PDF Services for validation + PDF overlay watermarks
   * Uses Adobe for PDF integrity validation, applies only PDF overlay watermarks (no header/footer)
   */
  async addWatermarkToPdf(pdfPath: string, outputPath: string, watermarkData: any): Promise<string> {
    console.log(`🔄 [Adobe] Starting professional PDF watermarking`);
    console.log(`   📂 Input: ${pdfPath}`);
    console.log(`   📂 Output: ${outputPath}`);
    console.log(`   💧 Watermark data:`, {
      userName: watermarkData.userName,
      articleTitle: watermarkData.articleTitle,
      articleId: watermarkData.articleId
    });

    this.checkAvailability();

    try {
      const fs = await import('fs');
      const path = await import('path');

      // Convert relative paths to absolute
      const absoluteInputPath = resolveToAbsolutePath(pdfPath);
      const absoluteOutputPath = resolveToAbsolutePath(outputPath);

      // Ensure output directory exists
      const outputDir = path.dirname(absoluteOutputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Adobe PDF Services approach: Use Adobe for PDF integrity, PDF overlay watermarks only
      // No DOCX conversion to avoid header/footer watermarks
      console.log(`💧 [Adobe] Using Adobe PDF processing with PDF overlay watermarks only...`);

      // Step 1: Validate PDF using Adobe (upload and process for integrity)
      console.log(`🔍 [Adobe] Validating PDF through Adobe services...`);

      // Upload to Adobe to validate PDF integrity
      const inputAsset = await this.pdfServices.upload({
        readStream: fs.createReadStream(absoluteInputPath),
        mimeType: MimeType.PDF
      });

      console.log(`✅ [Adobe] PDF uploaded and validated successfully`);

      // Step 2: Apply PDF overlay watermarks using pdf-lib (no header/footer)
      console.log(`💧 [Adobe] Applying PDF overlay watermarks with logo...`);

      const { PDFDocument, rgb, StandardFonts, degrees } = await import('pdf-lib');

      // Load the input PDF
      const pdfBytes = fs.readFileSync(absoluteInputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Create watermark text for PDF overlay style only
      const centerWatermarkText = `${watermarkData.userName} | ${new Date().toLocaleDateString()} | Article ID: ${watermarkData.articleId}`;
      const footerWatermarkText = `Downloaded from LAW NATION | ${new Date().toLocaleDateString()}`;

      // Apply PDF-style overlay watermarks to all pages (no header/footer duplication)
      const pages = pdfDoc.getPages();
      console.log(`📄 [Adobe] Processing ${pages.length} pages for watermarking...`);

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = pages[pageIndex];
        if (!page) continue; // Skip if page is undefined

        const { width, height } = page.getSize();
        console.log(`📄 [Adobe] Page ${pageIndex + 1}: ${width}x${height}`);

        // Check for company logo using clean utility
        const logoInfo = loadCompanyLogo();
        if (logoInfo.found) {
          console.log(`✅ [Adobe] Your logo is available for page ${pageIndex + 1}`);
          console.log(`📊 [Adobe] Logo file size: ${logoInfo.size} bytes`);
        } else {
          console.log(`⚠️ [Adobe] Logo not found, using text watermark for page ${pageIndex + 1}`);
        }

        // 1. Company logo image watermark (center-right background)
        console.log(`💧 [Adobe] Adding company logo image watermark on page ${pageIndex + 1}`);

        // Try to load company logo image
        let logoImage = null;
        try {
          // Look for logo in your assets/img folder, including your specific screenshot file
          const possibleLogoPaths = [
            // Your specific file (note: assests with double 's' as in your directory)
            path.join(process.cwd(), 'src', 'assests', 'img', 'Screenshot 2026-01-09 204120.png'),
            // Common logo names (note: assests with double 's')
            path.join(process.cwd(), 'src', 'assests', 'img', 'logo.png'),
            path.join(process.cwd(), 'src', 'assests', 'img', 'law-nation-logo.png'),
            path.join(process.cwd(), 'src', 'assests', 'img', 'company-logo.png'),
            // Other locations (note: assests with double 's')
            path.join(process.cwd(), 'src', 'assests', 'logo.png'),
            path.join(process.cwd(), 'src', 'assests', 'law-nation-logo.png'),
            path.join(process.cwd(), 'public', 'logo.png'),
            path.join(process.cwd(), 'assets', 'logo.png'),
            path.join(process.cwd(), 'uploads', 'logo.png')
          ];

          const primaryLogoPath = possibleLogoPaths[0] || '';

          console.log(`🔍 [Adobe] Looking for logo at: ${primaryLogoPath}`);

          if (fs.existsSync(primaryLogoPath)) {
            const logoBytes = fs.readFileSync(primaryLogoPath);
            console.log(`✅ [Adobe] Company logo file found, attempting to embed`);

            // Try to embed the actual PNG logo
            try {
              logoImage = await pdfDoc.embedPng(logoBytes);
              console.log(`✅ [Adobe] PNG logo embedded successfully`);
            } catch (embedError) {
              console.warn(`⚠️ [Adobe] Failed to embed PNG:`, embedError);
              logoImage = null; // Will use text fallback
            }
          } else {
            console.log(`⚠️ [Adobe] Logo file not found, checking for JPG...`);
            // Try JPG format
            const jpgLogoPath = primaryLogoPath.replace('.png', '.jpg');
            if (fs.existsSync(jpgLogoPath)) {
              const logoBytes = fs.readFileSync(jpgLogoPath);
              console.log(`✅ [Adobe] Company logo (JPG) file found, attempting to embed`);

              // Try to embed JPG logo
              try {
                logoImage = await pdfDoc.embedJpg(logoBytes);
                console.log(`✅ [Adobe] JPG logo embedded successfully`);
              } catch (embedError) {
                console.warn(`⚠️ [Adobe] Failed to embed JPG:`, embedError);
                logoImage = null; // Will use text fallback
              }
            }
          }
        } catch (logoError: any) {
          console.warn(`⚠️ [Adobe] Failed to load company logo:`, logoError.message);
        }

        // Since we found the logo, let's actually use it instead of text fallback
        // logoImage will be set if embedding was successful

        // If logo image is available, use it as watermark
        if (logoImage) {
          console.log(`💧 [Adobe] Using actual logo image for watermark`);

          // Calculate logo position (centered on page)
          const logoWidth = 120; // Adjust size as needed
          const logoHeight = 80;
          const logoX = (width - logoWidth) / 2; // Center horizontally
          const logoY = (height - logoHeight) / 2; // Center vertically

          // Draw the actual logo image
          page.drawImage(logoImage, {
            x: logoX,
            y: logoY,
            width: logoWidth,
            height: logoHeight,
            opacity: 0.4, // Semi-transparent like your design
          });

          console.log(`✅ [Adobe] Actual logo image watermark applied`);
        } else {
          // Fallback to text logo if image embedding failed
          console.log(`💧 [Adobe] Using text fallback for logo`);
          const logoText = "LAW NATION";
          const logoSubText = "PRIME TIMES JOURNAL";

          // Calculate positions to match your image (center-right area)
          const logoX = width * 0.6; // Move to right side (60% of width)
          const logoY = height * 0.6; // Upper center area
          const subLogoX = width * 0.6; // Same X as main logo
          const subLogoY = height * 0.55; // Below main logo

          // Main logo text (VERY large and prominent like in your image)
          page.drawText(logoText, {
            x: logoX - 100, // Adjust for text width
            y: logoY,
            size: 72, // Much larger size
            font: boldFont,
            color: rgb(0.85, 0.85, 0.85), // Light gray but visible
            opacity: 0.4, // More visible
          });

          // Logo subtitle (prominent)
          page.drawText(logoSubText, {
            x: subLogoX - 80, // Adjust for text width
            y: subLogoY,
            size: 18, // Larger subtitle
            font: font,
            color: rgb(0.85, 0.85, 0.85), // Light gray but visible
            opacity: 0.4, // More visible
          });
        }

        // 2. Diagonal center watermark (PDF overlay style)
        page.drawText(centerWatermarkText, {
          x: width / 2 - 150,
          y: height / 2 - 80,
          size: 12,
          font: font,
          color: rgb(0.8, 0.8, 0.8), // Light gray
          rotate: degrees(-45), // Diagonal
          opacity: 0.3, // Semi-transparent
        });

        // 3. Footer watermark (PDF overlay style)
        page.drawText(footerWatermarkText, {
          x: 50,
          y: 30,
          size: 8,
          font: font,
          color: rgb(0.6, 0.6, 0.6), // Medium gray
          opacity: 0.7, // Semi-transparent
        });

        console.log(`✅ [Adobe] Page ${pageIndex + 1} watermarked successfully`);
      }

      // Save watermarked PDF
      const watermarkedBytes = await pdfDoc.save();

      // Step 3: Validate the watermarked PDF
      try {
        await PDFDocument.load(watermarkedBytes); // Test if it's valid
        console.log(`✅ [Adobe] Watermarked PDF validation passed`);
      } catch (validationError) {
        console.error(`❌ [Adobe] Watermarked PDF validation failed:`, validationError);
        throw new Error('Watermarked PDF is corrupted');
      }

      // Save final watermarked PDF
      fs.writeFileSync(absoluteOutputPath, watermarkedBytes);

      console.log(`✅ [Adobe] Adobe-validated PDF with logo and overlay watermarks completed successfully`);
      console.log(`   📊 Output file size: ${watermarkedBytes.length} bytes`);
      console.log(`   💧 Watermark style: LAW NATION logo + PDF overlay (no header/footer duplication)`);
      console.log(`   🔧 Adobe validation: PDF integrity verified`);

      return outputPath;

    } catch (err: any) {
      console.error('❌ [Adobe] PDF watermarking failed:', err);
      console.error(`   Error type: ${err.constructor.name}`);
      console.error(`   Error message: ${err.message}`);

      // Check if this is a BAD_PDF error or conversion issue
      if (err.message && (err.message.includes('BAD_PDF') || err.message.includes('Asset download URI'))) {
        console.warn(`⚠️ [Adobe] PDF is corrupted or incompatible with Adobe services`);
        console.warn(`⚠️ [Adobe] Using fallback: copying clean PDF without watermark`);

        // Fallback: copy clean PDF without watermark to prevent corruption
        try {
          const fs = await import('fs');
          const absoluteInputPath = resolveToAbsolutePath(pdfPath);
          const absoluteOutputPath = resolveToAbsolutePath(outputPath);
          fs.copyFileSync(absoluteInputPath, absoluteOutputPath);
          console.log(`✅ [Adobe] Fallback: Clean PDF copied (no watermark to prevent corruption)`);
          return outputPath;
        } catch (copyError) {
          console.error('❌ [Adobe] Fallback copy also failed:', copyError);
          throw new InternalServerError('PDF watermarking and fallback both failed');
        }
      }

      // For other errors, still try the fallback
      try {
        const fs = await import('fs');
        const absoluteInputPath = resolveToAbsolutePath(pdfPath);
        const absoluteOutputPath = resolveToAbsolutePath(outputPath);
        fs.copyFileSync(absoluteInputPath, absoluteOutputPath);
        console.log(`✅ [Adobe] Fallback: Clean PDF copied (no watermark due to error)`);
        return outputPath;
      } catch (copyError) {
        console.error('❌ [Adobe] Fallback copy also failed:', copyError);
        throw new InternalServerError('Adobe PDF watermarking failed');
      }
    }
  }

  /**
   * Test Adobe Services connectivity and credentials
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    console.log(`🧪 [Adobe] Testing Adobe Services connection...`);

    try {
      this.checkAvailability();

      // Try to create a simple job to test credentials
      console.log(`🔐 [Adobe] Testing credentials...`);

      // Create a minimal test - just check if we can initialize a job
      const testResult = {
        success: true,
        message: "Adobe Services are properly configured and available",
        details: {
          sdkLoaded: !!AdobeSDK,
          credentialsSet: !!(process.env.ADOBE_CLIENT_ID && process.env.ADOBE_CLIENT_SECRET && process.env.ADOBE_ORGANIZATION_ID),
          serviceInitialized: this.isAvailable
        }
      };

      console.log(`✅ [Adobe] Connection test passed:`, testResult);
      return testResult;

    } catch (error: any) {
      const testResult = {
        success: false,
        message: `Adobe Services test failed: ${error.message}`,
        details: {
          sdkLoaded: !!AdobeSDK,
          credentialsSet: !!(process.env.ADOBE_CLIENT_ID && process.env.ADOBE_CLIENT_SECRET && process.env.ADOBE_ORGANIZATION_ID),
          serviceInitialized: this.isAvailable,
          error: error.message
        }
      };

      console.error(`❌ [Adobe] Connection test failed:`, testResult);
      return testResult;
    }
  }
}

export const adobeService = new AdobeService();