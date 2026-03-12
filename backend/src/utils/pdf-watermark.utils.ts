// import { PDFDocument, rgb, PDFName, PDFString } from 'pdf-lib';
// import fs from 'fs';
// import path from 'path';
// import { downloadFileToBuffer } from './pdf-extract.utils.js';

// /**
//  * Add watermark to PDF with conditional clickable link
//  * @param pdfPath - Path to PDF file (local or URL)
//  * @param options - Watermark options
//  * @param userRole - User role (USER, EDITOR, REVIEWER, ADMIN)
//  * @param articleStatus - Article status (PUBLISHED, DRAFT, etc.)
//  * @param citationNumber - Citation number to display at top of each page (USER only)
//  * @returns Watermarked PDF as Buffer
//  */
// export async function addWatermarkToPdf(
//   pdfPath: string,
//   options: {
//     userName?: string;
//     downloadDate: Date;
//     articleTitle?: string;
//     articleId: string;
//     articleSlug?: string;
//     frontendUrl: string;
//   },
//   userRole: 'USER' | 'EDITOR' | 'REVIEWER' | 'ADMIN' = 'USER',
//   articleStatus: string = 'PUBLISHED',
//   citationNumber?: string
// ): Promise<Buffer> {
//   console.log('\n[Watermark] Starting watermarking process...');
//   console.log('[Watermark] PDF path:', pdfPath);
//   console.log('[Watermark] User role:', userRole);
//   console.log('[Watermark] Article status:', articleStatus);
//   console.log('[Watermark] Citation number:', citationNumber || 'None');
//   console.log('[Watermark] Include URL:', userRole === 'USER' && articleStatus === 'PUBLISHED');

//   try {
//     // 1. Load original PDF
//     let pdfBytes: Buffer;

//     if (pdfPath.startsWith('http://') || pdfPath.startsWith('https://')) {
//       console.log('🌐 [Watermark] Downloading PDF from URL...');
//       pdfBytes = await downloadFileToBuffer(pdfPath);
//     } else {
//       console.log('💾 [Watermark] Reading PDF from local file...');
//       let filePath = pdfPath;

//       if (pdfPath.startsWith('/uploads')) {
//         filePath = path.join(process.cwd(), pdfPath);
//       }

//       if (!fs.existsSync(filePath)) {
//         console.error('❌ [Watermark] PDF file not found:', filePath);
//         throw new Error(`PDF file not found: ${filePath}`);
//       }

//       pdfBytes = fs.readFileSync(filePath);
//     }

//     console.log(`✅ [Watermark] PDF loaded successfully (${pdfBytes.length} bytes)`);

//     // 2. Load PDF document
//     console.log('📖 [Watermark] Loading PDF document...');
//     const pdfDoc = await PDFDocument.load(pdfBytes, {
//       ignoreEncryption: true,        // Bypasses "Owner Restrictions" in legal PDFs
//       throwOnInvalidObject: false    // Prevents crashing on minor structural errors
//     });
//     const pages = pdfDoc.getPages();

//     console.log(`📄 [Watermark] PDF has ${pages.length} pages`);

//     // 3. Load logo image — bulletproof path discovery
//     let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | undefined;
//     try {
//       const possibleSubPaths = [
//         ['public', 'assets', 'img', 'watermark.png'],
//         ['backend', 'public', 'assets', 'img', 'watermark.png'],
//         ['..', 'public', 'assets', 'img', 'watermark.png'],
//         ['src', 'assets', 'img', 'logo-bg.png'],
//         ['src', 'assests', 'img', 'logo-bg.png'],
//         ['backend', 'src', 'assets', 'img', 'logo-bg.png'],
//       ];

//       let logoPath = '';
//       for (const subPath of possibleSubPaths) {
//         const fullPath = path.join(process.cwd(), ...subPath);
//         if (fs.existsSync(fullPath)) {
//           logoPath = fullPath;
//           break;
//         }
//       }

//       if (logoPath) {
//         console.log(`✅ [PDF Watermark] Logo found at: ${logoPath}`);
//         const logoBuffer = fs.readFileSync(logoPath);
//         logoImage = await pdfDoc.embedPng(logoBuffer);
//         console.log('✅ [Watermark] Logo loaded successfully');
//       } else {
//         console.warn(
//           `⚠️ [PDF Watermark] Logo NOT found in checked paths ` +
//           `(Checked: ${possibleSubPaths.map(p => p.join('/')).join(', ')}). Skipping logo watermarks.`
//         );
//       }
//     } catch (error) {
//       console.warn('⚠️ [Watermark] Failed to load logo, skipping logo watermark:', error);
//     }

//     // 4. Prepare watermark variables based on user role and article status
//     const dateStr = options.downloadDate.toLocaleDateString('en-GB', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric'
//     });

//     const roleMap: Record<string, string> = {
//       'EDITOR': 'LAW NATION EDITOR',
//       'REVIEWER': 'LAW NATION REVIEWER',
//       'ADMIN': 'LAW NATION ADMIN',
//       'USER': 'LAW NATION'
//     };
//     const roleText = roleMap[userRole] || 'LAW NATION';

//     let includeUrl = false;
//     let articleUrl = '';
//     let linkText = '';
//     let noteText = '';

//     if (userRole === 'USER' && articleStatus === 'PUBLISHED') {
//       // End user downloading published article — include URL
//       includeUrl = true;
//       articleUrl = options.articleSlug
//         ? `${options.frontendUrl}/article/${options.articleSlug}`
//         : `${options.frontendUrl}/articles/${options.articleId}`;
//       linkText = `Download From: ${articleUrl}`;
//       noteText = `(Login required for full article)`;

//       console.log('[Watermark] User download - URL included');
//       console.log('[Watermark] Article URL:', articleUrl);
//     } else {
//       console.log('[Watermark] Editorial/unpublished - No URL included');
//       console.log('[Watermark] Role text:', roleText);
//     }

//     // 5. Add watermark to each page
//     console.log('✍️ [Watermark] Adding watermark to all pages...');

//     pages.forEach((page, index) => {
//       const mediaBox = page.getMediaBox();
//       const { width: pageW, height: pageH } = mediaBox;
//       const pageX = mediaBox.x;
//       const pageY = mediaBox.y;

//       // ── Citation number at top center (USER role only, red) ──────────────
//       if (citationNumber && userRole === 'USER') {
//         const citationFontSize = 12;
//         const estimatedTextWidth = citationNumber.length * (citationFontSize * 0.6);
//         const citationX = pageX + (pageW - estimatedTextWidth) / 2;

//         page.drawText(citationNumber, {
//           x: citationX,
//           y: pageY + pageH - 55,
//           size: citationFontSize,
//           color: rgb(0.8, 0, 0),
//           opacity: 1,
//         });

//         console.log(`📋 [Watermark] Added citation "${citationNumber}" to page ${index + 1}`);
//       }

//       // ── Center logo (all roles) ───────────────────────────────────────────
//       if (logoImage) {
//         const logoScale = 0.25;
//         const logoDims = logoImage.scale(logoScale);

//         page.drawImage(logoImage, {
//           x: pageX + (pageW / 2) - (logoDims.width / 2),
//           y: pageY + (pageH / 2) - (logoDims.height / 2),
//           width: logoDims.width,
//           height: logoDims.height,
//           opacity: 0.12,
//         });
//       }

//       // ── Bottom-right logo (all roles) ────────────────────────────────────
//       if (logoImage) {
//         const bottomLogoScale = 0.08;
//         const bottomLogoDims = logoImage.scale(bottomLogoScale);

//         page.drawImage(logoImage, {
//           x: pageX + pageW - bottomLogoDims.width - 20,
//           y: pageY + 20,
//           width: bottomLogoDims.width,
//           height: bottomLogoDims.height,
//           opacity: 0.35,
//         });
//       }

//       // ── Copyright notice at bottom center (USER role only) ───────────────
//       if (userRole === 'USER') {
//         const copyrightText = '© Law Nation Prime Times Journal. All rights reserved.';
//         const copyrightFontSize = 8;

//         const textWidth = copyrightText.length * (copyrightFontSize * 0.5);
//         const copyrightX = pageX + (pageW - textWidth) / 2;

//         page.drawText(copyrightText, {
//           x: copyrightX,
//           y: pageY + 10,
//           size: copyrightFontSize,
//           color: rgb(0.4, 0.4, 0.4),
//           opacity: 0.8,
//         });

//         if (index === 0) {
//           console.log(`© [Watermark] Added copyright notice to all pages`);
//         }
//       }

//       // ── Clickable download link (USER + PUBLISHED only) ──────────────────
//       if (includeUrl) {
//         console.log(`[Watermark] Adding clickable link to page ${index + 1}`);

//         // Blue link text
//         page.drawText(linkText, {
//           x: pageX + 50,
//           y: pageY + 30,
//           size: 9,
//           color: rgb(0, 0, 0.8),
//         });

//         // Gray note text
//         page.drawText(noteText, {
//           x: pageX + 50,
//           y: pageY + 15,
//           size: 7,
//           color: rgb(0.5, 0.5, 0.5),
//         });

//         // Clickable link annotation
//         const linkWidth = linkText.length * 5.5;
//         const linkAnnotation = pdfDoc.context.obj({
//           Type: 'Annot',
//           Subtype: 'Link',
//           Rect: [
//             pageX + 50,
//             pageY + 28,
//             Math.min(pageX + 50 + linkWidth, pageX + pageW - 50),
//             pageY + 42,
//           ],
//           Border: [0, 0, 0],
//           C: [0, 0, 1],
//           A: {
//             S: 'URI',
//             URI: PDFString.of(articleUrl),
//           },
//         });

//         const linkAnnotationRef = pdfDoc.context.register(linkAnnotation);

//         // Preserve existing annotations
//         const existingAnnots = page.node.get(PDFName.of('Annots'));
//         let annotsArray: any[];

//         if (existingAnnots && existingAnnots instanceof Array) {
//           annotsArray = [...existingAnnots, linkAnnotationRef];
//           console.log(`📎 [Watermark] Preserved ${existingAnnots.length} existing annotations on page ${index + 1}`);
//         } else if (existingAnnots) {
//           annotsArray = [existingAnnots, linkAnnotationRef];
//           console.log(`📎 [Watermark] Preserved 1 existing annotation on page ${index + 1}`);
//         } else {
//           annotsArray = [linkAnnotationRef];
//         }

//         page.node.set(PDFName.of('Annots'), pdfDoc.context.obj(annotsArray));
//         console.log(`✅ [Watermark] Clickable link added to page ${index + 1}`);
//       } else {
//         console.log(`❌ [Watermark] No clickable link added to page ${index + 1} (editorial user or unpublished article)`);
//       }
//     });

//     console.log(`✅ [Watermark] Watermark added to ${pages.length} pages`);
//     if (logoImage) {
//       console.log(`✅ [Watermark] Logo watermark added to center of all pages`);
//     }
//     if (includeUrl) {
//       console.log(`✅ [Watermark] Clickable link added to all pages`);
//     }

//     // 6. Save watermarked PDF
//     console.log('💾 [Watermark] Saving watermarked PDF...');
//     const watermarkedBytes = await pdfDoc.save();
//     const buffer = Buffer.from(watermarkedBytes);

//     console.log(`✅ [Watermark] Watermarked PDF created (${buffer.length} bytes)`);
//     console.log(`📊 [Watermark] Size increase: ${((buffer.length - pdfBytes.length) / 1024).toFixed(2)} KB`);
//     console.log('🏁 [Watermark] Watermarking process completed successfully\n');

//     return buffer;
//   } catch (error: unknown) {
//     console.error('❌ [Watermark] Watermarking failed!');
//     console.error('❌ [Watermark] Error:', error instanceof Error ? error.message : String(error));
//     console.error('❌ [Watermark] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
//     throw error;
//   }
// }



// 


import { PDFDocument, rgb, PDFName, PDFString, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { downloadFileToBuffer } from './pdf-extract.utils.js';

const LN_WATERMARK_FLAG = 'LN_WATERMARKED';

/**
 * Detect if a PDF already has a watermark applied by this system.
 * Uses a custom metadata flag written into the PDF Info dictionary at watermark time.
 */
function isPdfAlreadyWatermarked(pdfDoc: PDFDocument): boolean {
  try {
    const keywords = pdfDoc.getKeywords();
    if (keywords && keywords.includes(LN_WATERMARK_FLAG)) {
      console.log('[Watermark] Found LN_WATERMARKED metadata flag — PDF already watermarked');
      return true;
    }
    return false;
  } catch (error) {
    console.warn('[Watermark] Watermark detection failed, assuming not watermarked:', error);
    return false;
  }
}

/**
 * Add watermark to PDF with conditional clickable link.
 * Skips watermarking if the PDF already contains a watermark.
 *
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
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,       // Bypasses "Owner Restrictions" in legal PDFs
      throwOnInvalidObject: false   // Prevents crashing on minor structural errors
    });
    const pages = pdfDoc.getPages();
    console.log(`📄 [Watermark] PDF has ${pages.length} pages`);

    // ── 2a. DUPLICATE WATERMARK CHECK ────────────────────────────────────────
    console.log('🔍 [Watermark] Checking if PDF is already watermarked...');
    let skipLogo = false;
    if (isPdfAlreadyWatermarked(pdfDoc)) {
      if (userRole !== 'USER') {
        // Admin/Editor/Reviewer: PDF already has logo watermark — return unchanged
        console.log('⚠️  [Watermark] PDF already contains a watermark — skipping for non-user role');
        console.log('🏁 [Watermark] Returning original PDF bytes unchanged\n');
        return pdfBytes;
      }
      // USER role: logo already present — skip logo but still stamp copyright notice + clickable link
      console.log('⚠️  [Watermark] PDF already watermarked — skipping logo, adding copyright + link for user');
      skipLogo = true;
    } else {
      console.log('✅ [Watermark] No existing watermark found — proceeding with full watermarking');
    }
    // ─────────────────────────────────────────────────────────────────────────

    // 3. Load logo image — bulletproof path discovery
    let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | undefined;
    try {
      const possibleSubPaths = [
        ['public', 'assets', 'img', 'watermark.png'],
        ['backend', 'public', 'assets', 'img', 'watermark.png'],
        ['..', 'public', 'assets', 'img', 'watermark.png'],
        ['src', 'assets', 'img', 'logo-bg.png'],
        ['src', 'assests', 'img', 'logo-bg.png'],
        ['backend', 'src', 'assets', 'img', 'logo-bg.png'],
      ];

      let logoPath = '';
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
        console.log('✅ [Watermark] Logo loaded successfully');
      } else {
        console.warn(
          `⚠️ [PDF Watermark] Logo NOT found in checked paths ` +
          `(Checked: ${possibleSubPaths.map(p => p.join('/')).join(', ')}). Skipping logo watermarks.`
        );
      }
    } catch (error) {
      console.warn('⚠️ [Watermark] Failed to load logo, skipping logo watermark:', error);
    }

    // 4. Prepare watermark variables based on user role and article status
    const dateStr = options.downloadDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const roleMap: Record<string, string> = {
      'EDITOR': 'LAW NATION EDITOR',
      'REVIEWER': 'LAW NATION REVIEWER',
      'ADMIN': 'LAW NATION ADMIN',
      'USER': 'LAW NATION'
    };
    const roleText = roleMap[userRole] || 'LAW NATION';

    let includeUrl = false;
    let articleUrl = '';
    let linkText = '';
    let noteText = '';

    if (userRole === 'USER' && articleStatus === 'PUBLISHED') {
      includeUrl = true;
      articleUrl = options.articleSlug
        ? `${options.frontendUrl}/article/${options.articleSlug}`
        : `${options.frontendUrl}/articles/${options.articleId}`;
      linkText = `Download From: ${articleUrl}`;
      noteText = `(Login required for full article)`;

      console.log('[Watermark] User download - URL included');
      console.log('[Watermark] Article URL:', articleUrl);
    } else {
      console.log('[Watermark] Editorial/unpublished - No URL included');
      console.log('[Watermark] Role text:', roleText);
    }

    // 5. Add watermark to each page
    console.log('✍️ [Watermark] Adding watermark to all pages...');

    pages.forEach((page, index) => {
      const mediaBox = page.getMediaBox();
      const { width: pageW, height: pageH } = mediaBox;
      const pageX = mediaBox.x;
      const pageY = mediaBox.y;

      // ── Citation number at top center (USER role only, red) ──────────────
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

        console.log(`📋 [Watermark] Added citation "${citationNumber}" to page ${index + 1}`);
      }

      // ── Center logo (all roles) — skipped if PDF already has logo ──────
      if (logoImage && !skipLogo) {
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

      // ── Bottom-right logo (all roles) — skipped if PDF already has logo ─
      if (logoImage && !skipLogo) {
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

      // ── Copyright notice at bottom center (USER role only) ───────────────
      if (userRole === 'USER') {
        const copyrightText = '© Law Nation Prime Times Journal. All rights reserved.';
        const copyrightFontSize = 8;

        const textWidth = copyrightText.length * (copyrightFontSize * 0.5);
        const copyrightX = pageX + (pageW - textWidth) / 2;

        page.drawText(copyrightText, {
          x: copyrightX,
          y: pageY + 10,
          size: copyrightFontSize,
          color: rgb(0.4, 0.4, 0.4),
          opacity: 0.8,
        });

        if (index === 0) {
          console.log(`© [Watermark] Added copyright notice to all pages`);
        }
      }

      // ── Clickable download link (USER + PUBLISHED only) ──────────────────
      if (includeUrl) {
        console.log(`[Watermark] Adding clickable link to page ${index + 1}`);

        page.drawText(linkText, {
          x: pageX + 50,
          y: pageY + 30,
          size: 9,
          color: rgb(0, 0, 0.8),
        });

        page.drawText(noteText, {
          x: pageX + 50,
          y: pageY + 15,
          size: 7,
          color: rgb(0.5, 0.5, 0.5),
        });

        const linkWidth = linkText.length * 5.5;
        const linkAnnotation = pdfDoc.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [
            pageX + 50,
            pageY + 28,
            Math.min(pageX + 50 + linkWidth, pageX + pageW - 50),
            pageY + 42,
          ],
          Border: [0, 0, 0],
          C: [0, 0, 1],
          A: {
            S: 'URI',
            URI: PDFString.of(articleUrl),
          },
        });

        const linkAnnotationRef = pdfDoc.context.register(linkAnnotation);

        const existingAnnots = page.node.get(PDFName.of('Annots'));
        let annotsArray: any[];

        if (existingAnnots && existingAnnots instanceof Array) {
          annotsArray = [...existingAnnots, linkAnnotationRef];
          console.log(`📎 [Watermark] Preserved ${existingAnnots.length} existing annotations on page ${index + 1}`);
        } else if (existingAnnots) {
          annotsArray = [existingAnnots, linkAnnotationRef];
          console.log(`📎 [Watermark] Preserved 1 existing annotation on page ${index + 1}`);
        } else {
          annotsArray = [linkAnnotationRef];
        }

        page.node.set(PDFName.of('Annots'), pdfDoc.context.obj(annotsArray));
        console.log(`✅ [Watermark] Clickable link added to page ${index + 1}`);
      } else {
        console.log(`❌ [Watermark] No clickable link added to page ${index + 1} (editorial user or unpublished article)`);
      }
    });

    console.log(`✅ [Watermark] Watermark added to ${pages.length} pages`);
    if (logoImage) {
      console.log(`✅ [Watermark] Logo watermark added to center of all pages`);
    }
    if (includeUrl) {
      console.log(`✅ [Watermark] Clickable link added to all pages`);
    }

    // 6. Stamp watermark metadata flag so duplicate detection works on future calls
    const existingKeywords = pdfDoc.getKeywords() ?? '';
    const keywordList = existingKeywords
      ? existingKeywords.split(/\s+/).filter(Boolean)
      : [];
    if (!keywordList.includes(LN_WATERMARK_FLAG)) {
      keywordList.push(LN_WATERMARK_FLAG);
    }
    pdfDoc.setKeywords(keywordList);

    // 7. Save watermarked PDF
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

/**
 * Append only copyright notice + clickable download link to every page of a PDF.
 * No logo is drawn. Suitable for end-user downloads where the stored PDF is
 * already clean (no duplicate logo risk).
 */
export async function addCopyrightAndLinkToPdf(
  pdfPath: string,
  options: {
    articleId: string;
    articleSlug?: string;
    frontendUrl: string;
    citationNumber?: string;
  },
  articleStatus: string = 'PUBLISHED'
): Promise<Buffer> {
  console.log('\n========== [CopyrightLink] START ==========');
  console.log(`[CopyrightLink] PDF path     : ${pdfPath}`);
  console.log(`[CopyrightLink] Article ID   : ${options.articleId}`);
  console.log(`[CopyrightLink] Article slug : ${options.articleSlug || '(none)'}`);
  console.log(`[CopyrightLink] Article status: ${articleStatus}`);
  console.log(`[CopyrightLink] Frontend URL : ${options.frontendUrl}`);
  console.log(`[CopyrightLink] Citation     : ${options.citationNumber || '(none)'}`);

  try {
    // ── 1. Load raw PDF bytes ────────────────────────────────────────────────
    let pdfBytes: Buffer;

    if (pdfPath.startsWith('http://') || pdfPath.startsWith('https://')) {
      console.log('[CopyrightLink] Source: remote URL — downloading...');
      pdfBytes = await downloadFileToBuffer(pdfPath);
      console.log(`[CopyrightLink] Downloaded ${pdfBytes.length} bytes from URL`);
    } else {
      let filePath = pdfPath;
      if (pdfPath.startsWith('/uploads')) {
        filePath = path.join(process.cwd(), pdfPath);
        console.log(`[CopyrightLink] Resolved /uploads path to: ${filePath}`);
      }
      console.log(`[CopyrightLink] Source: local file — ${filePath}`);
      if (!fs.existsSync(filePath)) {
        console.error(`[CopyrightLink] ❌ File NOT found at: ${filePath}`);
        throw new Error(`PDF file not found: ${filePath}`);
      }
      pdfBytes = fs.readFileSync(filePath);
      console.log(`[CopyrightLink] Read ${pdfBytes.length} bytes from disk`);
    }

    // ── 2. Parse PDF ─────────────────────────────────────────────────────────
    console.log('[CopyrightLink] Parsing PDF document...');
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    });
    const pages = pdfDoc.getPages();
    console.log(`[CopyrightLink] PDF parsed OK — ${pages.length} page(s)`);

    // ── 3. Embed fonts (required by pdf-lib for reliable text drawing) ───────
    console.log('[CopyrightLink] Embedding Helvetica font...');
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    console.log('[CopyrightLink] Fonts embedded OK');

    // ── 4. Build URL / text values ───────────────────────────────────────────
    const includeUrl = articleStatus === 'PUBLISHED';
    const articleUrl = options.articleSlug
      ? `${options.frontendUrl}/article/${options.articleSlug}`
      : `${options.frontendUrl}/articles/${options.articleId}`;
    const linkText = `Download From: ${articleUrl}`;
    const noteText = `(Login required for full article)`;

    console.log(`[CopyrightLink] includeUrl   : ${includeUrl}`);
    console.log(`[CopyrightLink] Article URL  : ${articleUrl}`);
    console.log(`[CopyrightLink] Link text    : ${linkText}`);

    // ── 5. Stamp each page ───────────────────────────────────────────────────
    console.log('[CopyrightLink] Stamping pages...');

    for (let index = 0; index < pages.length; index++) {
      const page = pages[index];

      // getSize() respects CropBox and always gives (width, height) from (0,0)
      // This is the safe, visible coordinate space — never use getMediaBox() for drawing
      const { width: pageW, height: pageH } = page.getSize();

      console.log(`[CopyrightLink]   Page ${index + 1}/${pages.length} — visible size ${pageW.toFixed(0)}x${pageH.toFixed(0)}`);

      // Footer band positions (all relative to 0,0 = bottom-left of visible page)
      // 65 pt from bottom = well inside the visible margin on all PDF viewers
      const FOOTER_TOP = 65;      // top of footer band
      const LINK_Y     = 52;      // "Download From:" line
      const NOTE_Y     = 38;      // "(Login required)" line
      const COPYRIGHT_Y = 24;     // copyright line
      const LINE_Y      = 70;     // thin separator line above footer

      // Separator line
      page.drawLine({
        start: { x: 40, y: LINE_Y },
        end:   { x: pageW - 40, y: LINE_Y },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
        opacity: 0.6,
      });

      // Citation number at top center (red)
      if (options.citationNumber) {
        const citationFontSize = 12;
        const estimatedTextWidth = helveticaBold.widthOfTextAtSize(options.citationNumber, citationFontSize);
        const citationX = (pageW - estimatedTextWidth) / 2;
        console.log(`[CopyrightLink]   → Drawing citation "${options.citationNumber}" at (${citationX.toFixed(0)}, ${(pageH - 45).toFixed(0)})`);
        page.drawText(options.citationNumber, {
          x: citationX,
          y: pageH - 45,
          size: citationFontSize,
          font: helveticaBold,
          color: rgb(0.8, 0, 0),
          opacity: 1,
        });
      }

      // Copyright notice at bottom center
      const copyrightText = '(C) Law Nation Prime Times Journal. All rights reserved.';
      const copyrightFontSize = 9;
      const textWidth = helvetica.widthOfTextAtSize(copyrightText, copyrightFontSize);
      const copyrightX = (pageW - textWidth) / 2;
      console.log(`[CopyrightLink]   → Drawing copyright at (${copyrightX.toFixed(0)}, ${COPYRIGHT_Y})`);
      page.drawText(copyrightText, {
        x: copyrightX,
        y: COPYRIGHT_Y,
        size: copyrightFontSize,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
        opacity: 1,
      });

      // Clickable download link
      if (includeUrl) {
        console.log(`[CopyrightLink]   → Drawing link text at (40, ${LINK_Y})`);
        page.drawText(linkText, {
          x: 40,
          y: LINK_Y,
          size: 9,
          font: helvetica,
          color: rgb(0, 0, 0.8),
        });

        page.drawText(noteText, {
          x: 40,
          y: NOTE_Y,
          size: 8,
          font: helvetica,
          color: rgb(0.4, 0.4, 0.4),
        });

        const linkWidth = helvetica.widthOfTextAtSize(linkText, 9);
        const linkAnnotation = pdfDoc.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [
            40,
            LINK_Y - 2,
            Math.min(40 + linkWidth, pageW - 40),
            LINK_Y + 12,
          ],
          Border: [0, 0, 0],
          C: [0, 0, 1],
          A: {
            S: 'URI',
            URI: PDFString.of(articleUrl),
          },
        });

        const linkAnnotationRef = pdfDoc.context.register(linkAnnotation);
        const existingAnnots = page.node.get(PDFName.of('Annots'));
        let annotsArray: any[];
        if (existingAnnots && existingAnnots instanceof Array) {
          annotsArray = [...existingAnnots, linkAnnotationRef];
        } else if (existingAnnots) {
          annotsArray = [existingAnnots, linkAnnotationRef];
        } else {
          annotsArray = [linkAnnotationRef];
        }
        page.node.set(PDFName.of('Annots'), pdfDoc.context.obj(annotsArray));
        console.log(`[CopyrightLink]   → Clickable link annotation added`);
      } else {
        console.log(`[CopyrightLink]   → Skipping link (article not PUBLISHED)`);
      }
    }

    // ── 6. Save ──────────────────────────────────────────────────────────────
    console.log('[CopyrightLink] Saving PDF...');
    const resultBytes = await pdfDoc.save();
    const resultBuffer = Buffer.from(resultBytes);

    console.log(`[CopyrightLink] Original size : ${pdfBytes.length} bytes`);
    console.log(`[CopyrightLink] Final size    : ${resultBuffer.length} bytes`);
    console.log(`[CopyrightLink] Size delta    : +${((resultBuffer.length - pdfBytes.length) / 1024).toFixed(2)} KB`);
    console.log('========== [CopyrightLink] END (success) ==========\n');

    return resultBuffer;
  } catch (error: unknown) {
    console.error('========== [CopyrightLink] END (FAILED) ==========');
    console.error('[CopyrightLink] Error:', error instanceof Error ? error.message : String(error));
    console.error('[CopyrightLink] Stack:', error instanceof Error ? error.stack : 'no stack');
    throw error;
  }
}