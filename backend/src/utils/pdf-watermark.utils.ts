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
  articleStatus: string = 'PUBLISHED'
): Promise<Buffer> {
  console.log('\n[Watermark] Starting watermarking process...');
  console.log('[Watermark] PDF path:', pdfPath);
  console.log('[Watermark] User role:', userRole);
  console.log('[Watermark] Article status:', articleStatus);
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
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    console.log(`� [Watermark] PDF has ${pages.length} pages`);
    
    // 3. Load logo image
    let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | undefined;
    try {
      const logoPath = path.join(process.cwd(), 'src', 'assests', 'img', 'Screenshot 2026-01-09 204120.png');
      console.log('🖼️ [Watermark] Loading logo from:', logoPath);
      
      if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath);
        logoImage = await pdfDoc.embedPng(logoBytes);
        console.log('✅ [Watermark] Logo loaded successfully');
      } else {
        console.warn('⚠️ [Watermark] Logo file not found, skipping logo watermark');
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
    
    let watermarkText: string;
    let roleText: string;
    let includeUrl = false;
    let articleUrl = '';
    let linkText = '';
    let noteText = '';
    
    // Determine watermark content based on user role and article status
    if (userRole === 'USER' && articleStatus === 'PUBLISHED') {
      // End user downloading published article - include URL
      watermarkText = `Downloaded from LAW NATION on ${dateStr}`;
      roleText = 'LAW NATION';
      includeUrl = true;
      articleUrl = options.articleSlug 
        ? `${options.frontendUrl}/law/article/${options.articleSlug}`
        : `${options.frontendUrl}/law/articles/${options.articleId}`;
      linkText = `Link: ${articleUrl}`;
      noteText = `(Login required for full article)`;
      
      console.log('[Watermark] User download - URL included');
      console.log('[Watermark] Article URL:', articleUrl);
    } else {
      // Editorial staff or unpublished article - no URL
      const roleMap = {
        'EDITOR': 'LAW NATION EDITOR',
        'REVIEWER': 'LAW NATION REVIEWER', 
        'ADMIN': 'LAW NATION ADMIN',
        'USER': 'LAW NATION'
      };
      
      roleText = roleMap[userRole] || 'LAW NATION';
      watermarkText = `Downloaded from ${roleText} on ${dateStr}`;
      
      if (userRole !== 'USER') {
        watermarkText += ' - For Editorial Use Only';
      }
      
      includeUrl = false;
      console.log('[Watermark] Editorial/unpublished - No URL included');
      console.log('[Watermark] Role text:', roleText);
    }
    
    console.log('[Watermark] Watermark text:', watermarkText);
    
    // 5. Add watermark to each page
    console.log('✍️ [Watermark] Adding watermark to all pages...');
    
    pages.forEach((page, index) => {
      const { width, height } = page.getSize();
      
      // Add logo in center of page (if loaded)
      if (logoImage) {
        const logoScale = 0.3; // Scale logo to 30% of original size
        const logoDims = logoImage.scale(logoScale);
        
        // Calculate center position
        const logoX = (width - logoDims.width) / 2;
        const logoY = (height - logoDims.height) / 2;
        
        // Draw logo with low opacity
        page.drawImage(logoImage, {
          x: logoX,
          y: logoY,
          width: logoDims.width,
          height: logoDims.height,
          opacity: 0.15, // 15% opacity - very light
        });
      }
      
      // Top-right watermark (Role-based text) - on ALL pages
      page.drawText(roleText, {
        x: width - 120,
        y: height - 30,
        size: 12,
        color: rgb(0.7, 0, 0),  // Red color
        opacity: 0.5,
      });
      
      // Bottom-left watermark - Download info - on ALL pages
      page.drawText(watermarkText, {
        x: 50,
        y: 45,
        size: 10,
        color: rgb(0.5, 0.5, 0.5),  // Gray color
        opacity: 0.7,
      });
      
      // Add clickable link ONLY for users with published articles on FIRST page
      if (includeUrl) {
         console.log(`[Watermark] Adding clickable link to page ${index + 1}`);

        
        // Clickable link text
        page.drawText(linkText, {
          x: 50,
          y: 30,
          size: 9,
          color: rgb(0, 0, 0.8),  // Blue color for link
        });
        
        // Add note about login requirement
        page.drawText(noteText, {
          x: 50,
          y: 15,
          size: 7,
          color: rgb(0.5, 0.5, 0.5),  // Gray color
        });
        
        // Add clickable link annotation
        const linkWidth = linkText.length * 5.5;  // Approximate width
        const linkAnnotation = pdfDoc.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [50, 28, Math.min(50 + linkWidth, width - 50), 42],
          Border: [0, 0, 0],
          C: [0, 0, 1],
          A: {
            S: 'URI',
            URI: PDFString.of(articleUrl),
          },
        });
        
        const linkAnnotationRef = pdfDoc.context.register(linkAnnotation);
        
        // Preserve existing annotations instead of overwriting
        const existingAnnots = page.node.get(PDFName.of('Annots'));
        
        let annotsArray: any[];
        if (existingAnnots && existingAnnots instanceof Array) {
          // PDF already has annotations - add our link to them
          annotsArray = [...existingAnnots, linkAnnotationRef];
          console.log(`📎 [Watermark] Preserved ${existingAnnots.length} existing annotations on page 1`);
        } else if (existingAnnots) {
          // Existing annotations exist but not as array - keep them and add ours
          annotsArray = [existingAnnots, linkAnnotationRef];
          console.log(`📎 [Watermark] Preserved 1 existing annotation on page 1`);
        } else {
          // PDF has no annotations - create new array
          annotsArray = [linkAnnotationRef];
        }
        
        page.node.set(PDFName.of('Annots'), pdfDoc.context.obj(annotsArray));
        console.log(`✅ [Watermark] Clickable link added to page ${index + 1}`);

      } else{
        console.log(`❌ [Watermark] No clickable link added to page ${index + 1} (editorial user or unpublished article)`);
      }
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