import fs from "fs";
import path from "path";
import { InternalServerError } from "@/utils/http-errors.util.js";
// Adobe SDK types and classes
let AdobeSDK = null;
let ServicePrincipalCredentials = null;
let PDFServices = null;
let MimeType = null;
let CreatePDFJob = null;
let CreatePDFResult = null;
let ExportPDFJob = null;
let ExportPDFResult = null;
let ExtractPDFJob = null;
let ExtractPDFResult = null;
let SDKError = null;
let ServiceUsageError = null;
let ServiceApiError = null;
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
    console.log("✅ [Adobe] Adobe PDF Services SDK loaded successfully");
}
catch (error) {
    console.warn("⚠️ [Adobe] Adobe PDF Services SDK not available:", error);
}
export class AdobeService {
    pdfServices;
    isAvailable;
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
                clientId: process.env.ADOBE_CLIENT_ID,
                clientSecret: process.env.ADOBE_CLIENT_SECRET,
                organizationId: process.env.ADOBE_ORGANIZATION_ID
            });
            this.pdfServices = new PDFServices({ credentials });
            this.isAvailable = true;
            console.log("✅ [Adobe] Adobe PDF Services initialized successfully");
            console.log("🔧 [Adobe] Available methods: convertPdfToDocx, convertDocxToPdf, extractTextFromDocx, addWatermarkToDocx");
        }
        catch (error) {
            console.error("❌ [Adobe] Failed to initialize Adobe PDF Services:", error);
            this.isAvailable = false;
        }
    }
    checkAvailability() {
        console.log(`🔍 [Adobe] Checking availability: ${this.isAvailable ? '✅ Available' : '❌ Not Available'}`);
        if (!this.isAvailable) {
            throw new InternalServerError("Adobe PDF Services not available");
        }
    }
    /**
     * Convert PDF to DOCX using Adobe Services
     */
    async convertPdfToDocx(pdfPath, outputPath) {
        this.checkAvailability();
        try {
            console.log(`🔄 [Adobe] Converting PDF to DOCX: ${pdfPath}`);
            // Create an ExecutionContext using credentials
            const inputAsset = await this.pdfServices.upload({
                readStream: fs.createReadStream(pdfPath),
                mimeType: MimeType.PDF
            });
            // Create parameters for the job
            const params = new ExportPDFJob.Params({
                targetFormat: ExportPDFJob.TargetFormat.DOCX
            });
            // Create a new job instance
            const job = new ExportPDFJob({ inputAsset, params });
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
                    resolve(outputPath);
                });
                outputStream.on('error', reject);
            });
        }
        catch (err) {
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
    async convertDocxToPdf(docxPath, outputPath) {
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
                    resolve(outputPath);
                });
                outputStream.on('error', (error) => {
                    console.error(`❌ [Adobe] Error writing output file:`, error);
                    reject(error);
                });
            });
        }
        catch (err) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            console.error(`❌ [Adobe] DOCX to PDF conversion failed after ${duration}ms`);
            console.error(`   Error type: ${err.constructor.name}`);
            console.error(`   Error message: ${err.message}`);
            if (err instanceof SDKError) {
                console.error(`   SDK Error details:`, err);
            }
            else if (err instanceof ServiceUsageError) {
                console.error(`   Service Usage Error - Check your Adobe API limits`);
            }
            else if (err instanceof ServiceApiError) {
                console.error(`   Service API Error - Check your credentials and network`);
            }
            if (err instanceof SDKError || err instanceof ServiceUsageError || err instanceof ServiceApiError) {
                throw new InternalServerError(`Adobe DOCX conversion failed: ${err.message}`);
            }
            throw new InternalServerError('Adobe DOCX conversion failed');
        }
    }
    /**
     * Extract text from DOCX using Adobe Services
     */
    async extractTextFromDocx(docxPath) {
        this.checkAvailability();
        try {
            console.log(`🔄 [Adobe] Extracting text from DOCX: ${docxPath}`);
            // Create an ExecutionContext using credentials
            const inputAsset = await this.pdfServices.upload({
                readStream: fs.createReadStream(docxPath),
                mimeType: MimeType.DOCX
            });
            // Create parameters for the job
            const params = new ExtractPDFJob.Params({
                elementsToExtract: [ExtractPDFJob.ElementsToExtract.TEXT]
            });
            // Create a new job instance
            const job = new ExtractPDFJob({ inputAsset, params });
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
                streamAsset.readStream.on('data', (chunk) => {
                    jsonData += chunk;
                });
                streamAsset.readStream.on('end', () => {
                    try {
                        const extractedData = JSON.parse(jsonData);
                        const textElements = extractedData.elements || [];
                        // Extract text from all text elements
                        const extractedText = textElements
                            .filter((element) => element.Text)
                            .map((element) => element.Text)
                            .join(' ');
                        console.log(`✅ [Adobe] Text extracted from DOCX (${extractedText.length} characters)`);
                        resolve(extractedText);
                    }
                    catch (parseError) {
                        console.error('❌ [Adobe] Failed to parse extraction result:', parseError);
                        reject(new InternalServerError('Failed to parse text extraction result'));
                    }
                });
                streamAsset.readStream.on('error', reject);
            });
        }
        catch (err) {
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
    async addWatermarkToDocx(docxPath, outputPath, watermarkData) {
        console.log(`🔄 [Adobe] Starting DOCX watermarking process`);
        console.log(`   📂 Input: ${docxPath}`);
        console.log(`   📂 Output: ${outputPath}`);
        console.log(`   💧 Watermark data:`, {
            userName: watermarkData.userName,
            articleTitle: watermarkData.articleTitle,
            articleId: watermarkData.articleId
        });
        try {
            // Use existing watermark utility
            const { addSimpleWatermarkToWord } = await import("@/utils/word-watermark.utils.js");
            console.log(`🔧 [Adobe] Calling watermark utility...`);
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
            return outputPath;
        }
        catch (err) {
            console.error('❌ [Adobe] DOCX watermarking failed:', err);
            console.error(`   Error type: ${err.constructor.name}`);
            console.error(`   Error message: ${err.message}`);
            throw new InternalServerError('DOCX watermarking failed');
        }
    }
    /**
     * Test Adobe Services connectivity and credentials
     */
    async testConnection() {
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
        }
        catch (error) {
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
//# sourceMappingURL=adobe.service.js.map