import fs from "fs";
import path from "path";
import { InternalServerError } from "@/utils/http-errors.util.js";
import { resolveToAbsolutePath, fileExistsAtPath } from "@/utils/file-path.utils.js";
import { cleanWatermarkText } from "@/utils/text-cleaning.utils.js";

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
      console.log("🔧 [Adobe] Available methods: convertPdfToDocx, convertDocxToPdf, extractTextFromDocxUsingMammoth (with watermark cleaning), addWatermarkToDocx");
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
   * Extract text from DOCX using mammoth library (since Adobe ExtractPDF only works with PDFs)
   */
  async extractTextFromDocxUsingMammoth(docxPath: string): Promise<string> {
    console.log(`🔄 [Adobe] Extracting text from DOCX using mammoth: ${docxPath}`);

    try {
      // Convert relative path to absolute path using utility
      const absolutePath = resolveToAbsolutePath(docxPath);

      if (!fileExistsAtPath(docxPath)) {
        console.error(`❌ [Adobe] Input file missing: ${absolutePath}`);
        throw new Error(`Input file not found locally: ${absolutePath}`);
      }

      // Use mammoth to extract text from DOCX
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const mammoth = require('mammoth');
      const fs = await import('fs');

      const buffer = fs.readFileSync(absolutePath);
      const result = await mammoth.extractRawText({ buffer });
      const rawText = result.value;

      console.log(`✅ [Adobe] Raw text extracted from DOCX using mammoth (${rawText.length} characters)`);
      
      // Clean watermark content from extracted text
      const cleanText = cleanWatermarkText(rawText);
      
      console.log(`✅ [Adobe] Text cleaned and ready (${cleanText.length} characters)`);
      return cleanText;

    } catch (err: any) {
      console.error('❌ [Adobe] DOCX text extraction failed:', err);
      throw new InternalServerError(`DOCX text extraction failed: ${err.message}`);
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
            const extractedData = JSON.parse(jsonData);
            const textElements = extractedData.elements || [];

            // Extract text from all text elements
            const extractedText = textElements
              .filter((element: any) => element.Text)
              .map((element: any) => element.Text)
              .join(' ');

            console.log(`✅ [Adobe] Text extracted from DOCX (${extractedText.length} characters)`);
            resolve(extractedText);
          } catch (parseError) {
            console.error('❌ [Adobe] Failed to parse extraction result:', parseError);
            reject(new InternalServerError('Failed to parse text extraction result'));
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

    try {
      // Use existing watermark utility - pass absolute paths
      const { addSimpleWatermarkToWord } = await import("@/utils/word-watermark.utils.js");

      console.log(`🔧 [Adobe] Calling watermark utility...`);
      // Pass absolute paths to the watermark utility
      const watermarkedBuffer = await addSimpleWatermarkToWord(docxPath, watermarkData);

      console.log(`✅ [Adobe] Watermark utility completed`);
      console.log(`   📊 Watermarked buffer size: ${watermarkedBuffer.length} bytes`);

      // Create output directory if it doesn't exist
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        console.log(`📁 [Adobe] Creating output directory: ${outputDir}`);
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write watermarked content to output path
      fs.writeFileSync(outputPath, watermarkedBuffer);

      const outputSize = fs.statSync(outputPath).size;
      console.log(`✅ [Adobe] Watermark added to DOCX successfully!`);
      console.log(`   📂 Output: ${outputPath}`);
      console.log(`   📊 Output size: ${(outputSize / 1024).toFixed(2)} KB`);

      // Return absolute path - let caller handle conversion to relative
      return outputPath;

    } catch (err: any) {
      console.error('❌ [Adobe] DOCX watermarking failed:', err);
      console.error(`   Error type: ${err.constructor.name}`);
      console.error(`   Error message: ${err.message}`);
      throw new InternalServerError('DOCX watermarking failed');
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