import { addWatermarkToPdf } from './pdf-watermark.utils.js';

/**
 * Add watermark to admin uploaded PDF
 * @param pdfPath - Path to PDF file (local or URL)
 * @param options - Admin PDF watermark options
 * @returns Object with original and watermarked PDF buffers
 */
export async function addAdminPdfWatermark(
  pdfPath: string,
  options: {
    title: string;
    issue: string; // Month
    volume: string; // Year
    adminName?: string;
  }
): Promise<{
  originalBuffer: Buffer;
  watermarkedBuffer: Buffer;
}> {
  console.log('\n[Admin PDF Watermark] Starting admin PDF watermarking...');
  console.log('[Admin PDF Watermark] PDF path:', pdfPath);
  console.log('[Admin PDF Watermark] Title:', options.title);
  console.log('[Admin PDF Watermark] Issue/Volume:', `${options.issue} ${options.volume}`);

  try {
    // Read original PDF for storage
    const fs = await import('fs');
    const path = await import('path');
    
    let originalBuffer: Buffer;
    
    if (pdfPath.startsWith('http://') || pdfPath.startsWith('https://')) {
      // Handle URL downloads if needed
      const { downloadFileToBuffer } = await import('./pdf-extract.utils.js');
      originalBuffer = await downloadFileToBuffer(pdfPath);
    } else {
      let filePath = pdfPath;
      if (pdfPath.startsWith('/uploads')) {
        filePath = path.join(process.cwd(), pdfPath);
      }
      originalBuffer = fs.readFileSync(filePath);
    }

    console.log(`✅ [Admin PDF Watermark] Original PDF loaded (${originalBuffer.length} bytes)`);

    // Create watermarked version using existing utility
    const watermarkedBuffer = await addWatermarkToPdf(
      pdfPath,
      {
        userName: options.adminName || 'LAW NATION ADMIN',
        downloadDate: new Date(),
        articleTitle: options.title,
        articleId: 'admin-upload',
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      },
      'ADMIN', // userRole - ensures no clickable URLs
      'PUBLISHED' // status - but URLs still won't show due to ADMIN role
    );

    console.log(`✅ [Admin PDF Watermark] Watermarked PDF created (${watermarkedBuffer.length} bytes)`);
    console.log(`📊 [Admin PDF Watermark] Size increase: ${((watermarkedBuffer.length - originalBuffer.length) / 1024).toFixed(2)} KB`);
    console.log('🏁 [Admin PDF Watermark] Admin PDF watermarking completed\n');

    return {
      originalBuffer,
      watermarkedBuffer
    };
  } catch (error) {
    console.error('❌ [Admin PDF Watermark] Failed to watermark admin PDF:', error);
    throw error;
  }
}