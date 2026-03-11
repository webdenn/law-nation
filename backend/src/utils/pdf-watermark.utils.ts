import { PDFDocument, rgb, PDFName, PDFString } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { downloadFileToBuffer } from './pdf-extract.utils.js';

/**
 * Add watermark to PDF with conditional clickable link
 * @param pdfPath - Path to PDF file (local or URL)
 * @param options - Watermark options
 * @param userRole - User role (USER, EDITOR, REVIEWER, ADMIN)
 * @param articleStatus - Article status (PUBLISHED, DRAFT, etc.)
 * @param citationNumber - Citation number to display at top of each page (USER only)
 * @returns Watermarked PDF as Buffer
 */
export async function addWatermarkToPdf(
  pdfPath: string,
  options: {
    userName?: string;
    downloadDate: Date;
    articleTitle?: string;
    articleId: string;
    articleSlug?: string;
    frontendUrl: string;
  },
  userRole: 'USER' | 'EDITOR' | 'REVIEWER' | 'ADMIN' = 'USER',
  articleStatus: string = 'PUBLISHED',
  citationNumber?: string
): Promise<Buffer> {
  console.log('\n[Watermark] Starting watermarking process...');
  console.log('[Watermark] PDF path:', pdfPath);
  console.log('[Watermark] User role:', userRole);
  console.log('[Watermark] Article status:', articleStatus);
  console.log('[Watermark] Citation number:', citationNumber || 'None');
  console.log('[Watermark] Include URL:', userRole === 'USER' && articleStatus === 'PUBLISHED');

  try {
    // 1. Load original PDF
    let pdfBytes: Buffer;

    if (pdfPath.startsWith('http://') || pdfPath.startsWith('https://')) {
      console.log('🌐 [Watermark] Downloading PDF from URL...');
      pdfBytes = await downloadFileToBuffer(pdfPath);
    } else {
      console.log('💾 [Watermark] Reading PDF from local file...');
      let filePath = pdfPath;

      if (pdfPath.startsWith('/uploads')) {
        filePath = path.join(process.cwd(), pdfPath);
      }

      if (!fs.existsSync(filePath)) {
        console.error('❌ [Watermark] PDF file not found:', filePath);
        throw new Error(`PDF file not found: ${filePath}`);
      }

      pdfBytes = fs.readFileSync(filePath);
    }

    console.log(`✅ [Watermark] PDF loaded successfully (${pdfBytes.length} bytes)`);

    // 2. Load PDF document
    console.log('📖 [Watermark] Loading PDF document...');
    // const pdfDoc = await PDFDocument.load(pdfBytes);
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,        // Bypasses "Owner Restrictions" in legal PDFs
      throwOnInvalidObject: false    // Prevents crashing on minor structural errors
    });
    const pages = pdfDoc.getPages();

    console.log(`� [Watermark] PDF has ${pages.length} pages`);

    // 3. Load logo image
    let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | undefined;
    try {
      // --- BULLETPROOF LOGO PATH DISCOVERY ---
      const possibleSubPaths = [
        ['public', 'assets', 'img', 'watermark.png'],
        ['backend', 'public', 'assets', 'img', 'watermark.png'],
        ['..', 'public', 'assets', 'img', 'watermark.png'],
        ['src', 'assets', 'img', 'logo-bg.png'],
        ['src', 'assests', 'img', 'logo-bg.png'],
        ['backend', 'src', 'assets', 'img', 'logo-bg.png'],
      ];

      let logoPath = "";
      for (const subPath of possibleSubPaths) {
        const fullPath = path.join(process.cwd(), ...subPath);
        if (fs.existsSync(fullPath)) {
          logoPath = fullPath;
          break;
        }
      }

      if (logoPath) {
        console.log(`✅ [PDF Watermark] Logo found at: ${logoPath}`);
        const logoBuffer = fs.readFileSync(logoPath);
        logoImage = await pdfDoc.embedPng(logoBuffer);
      } else {
        console.warn(`⚠️ [PDF Watermark] Logo NOT found in checked paths (Checked: ${possibleSubPaths.map(p => p.join('/')).join(', ')}). Skipping logo watermarks.`);
      }
    } catch (error) {
      console.warn('⚠️ [Watermark] Failed to load logo, skipping logo watermark:', error);
    }

    // 4. Prepare watermark text based on user role
    const dateStr = options.downloadDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Determine role text for logging (no longer drawn)
    const roleMap: Record<string, string> = {
      'EDITOR': 'LAW NATION EDITOR',
      'REVIEWER': 'LAW NATION REVIEWER',
      'ADMIN': 'LAW NATION ADMIN',
      'USER': 'LAW NATION'
    };
    const roleText = roleMap[userRole] || 'LAW NATION';
    const includeUrl = false; // Effectively disabled as per user request
    const watermarkText = ""; // Removed as per user request

    console.log('[Watermark] Watermarking for role:', roleText);

    // 5. Add watermark to each page
    console.log('✍️ [Watermark] Adding watermark to all pages...');

    pages.forEach((page, index) => {
      const mediaBox = page.getMediaBox();
      const { width: pageW, height: pageH } = mediaBox;
      const pageX = mediaBox.x;
      const pageY = mediaBox.y;

      // ✅ Add citation number at top center of page for USER role only (in red color)
      if (citationNumber && userRole === 'USER') {
        const citationFontSize = 12;
        const estimatedTextWidth = citationNumber.length * (citationFontSize * 0.6);
        const citationX = pageX + (pageW - estimatedTextWidth) / 2;

        page.drawText(citationNumber, {
          x: citationX,
          y: pageY + pageH - 55, 
          size: citationFontSize,
          color: rgb(0.8, 0, 0),
          opacity: 1,
        });
      }

      // 1. Add Center Logo
      if (logoImage) {
        const logoScale = 0.25; 
        const logoDims = logoImage.scale(logoScale);

        page.drawImage(logoImage, {
          x: pageX + (pageW / 2) - (logoDims.width / 2),
          y: pageY + (pageH / 2) - (logoDims.height / 2),
          width: logoDims.width,
          height: logoDims.height,
          opacity: 0.12,
        });
      }

      // 2. Add Bottom-Right Logo
      if (logoImage) {
        const bottomLogoScale = 0.08; 
        const bottomLogoDims = logoImage.scale(bottomLogoScale);

        page.drawImage(logoImage, {
          x: pageX + pageW - bottomLogoDims.width - 20,
          y: pageY + 20,
          width: bottomLogoDims.width,
          height: bottomLogoDims.height,
          opacity: 0.35, 
        });
      }

      // Copyright and links removed as per user request
    });

    console.log(`✅ [Watermark] Watermark added to ${pages.length} pages`);
    if (logoImage) {
      console.log(`✅ [Watermark] Logo watermark added to center of all pages`);
    }
    if (includeUrl) {
      console.log(`✅ [Watermark] Clickable link added to first page`);
    }

    // 6. Save watermarked PDF
    console.log('💾 [Watermark] Saving watermarked PDF...');
    const watermarkedBytes = await pdfDoc.save();
    const buffer = Buffer.from(watermarkedBytes);

    console.log(`✅ [Watermark] Watermarked PDF created (${buffer.length} bytes)`);
    console.log(`📊 [Watermark] Size increase: ${((buffer.length - pdfBytes.length) / 1024).toFixed(2)} KB`);
    console.log('🏁 [Watermark] Watermarking process completed successfully\n');

    return buffer;
  } catch (error: unknown) {
    console.error('❌ [Watermark] Watermarking failed!');
    console.error('❌ [Watermark] Error:', error instanceof Error ? error.message : String(error));
    console.error('❌ [Watermark] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}
