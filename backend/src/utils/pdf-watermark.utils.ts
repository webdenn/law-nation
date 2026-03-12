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



// applying new

import { PDFDocument, rgb, PDFName, PDFString, PDFDict, PDFArray, PDFRef } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { downloadFileToBuffer } from './pdf-extract.utils.js';

/**
 * Checks if a PDF already contains a Law Nation watermark.
 * Strategy: scan all page content streams for the watermark marker string.
 */
async function isAlreadyWatermarked(pdfDoc: PDFDocument): Promise<boolean> {
  const WATERMARK_MARKER = 'Law Nation'; // Must match text drawn in watermark

  try {
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      // Check page content streams for watermark text
      const contentStream = page.node.get(PDFName.of('Contents'));
      if (!contentStream) continue;

      // Resolve single ref or array of refs
      const resolveStream = (ref: any): string => {
        try {
          const obj = pdfDoc.context.lookup(ref);
          if (!obj) return '';
          const bytes = (obj as any).contents ?? (obj as any).getContents?.() ?? null;
          if (bytes) return Buffer.from(bytes).toString('utf-8', 0, 2000); // Sample first 2KB
          return '';
        } catch {
          return '';
        }
      };

      let streamText = '';

      if (contentStream instanceof PDFArray) {
        for (let i = 0; i < contentStream.size(); i++) {
          streamText += resolveStream(contentStream.get(i));
        }
      } else {
        streamText = resolveStream(contentStream);
      }

      // Check for watermark marker text in content stream
      if (streamText.includes('Law Nation') || streamText.includes('lawnation') || streamText.includes('Download From:')) {
        console.log('[Watermark] ⚠️ Existing watermark detected in PDF — skipping re-watermark');
        return true;
      }

      // Also check annotations — if any Link annotation with our domain exists
      const annots = page.node.get(PDFName.of('Annots'));
      if (annots) {
        const annotsArray = annots instanceof PDFArray ? annots : null;
        if (annotsArray) {
          for (let i = 0; i < annotsArray.size(); i++) {
            try {
              const annotRef = annotsArray.get(i);
              const annot = pdfDoc.context.lookup(annotRef) as PDFDict;
              if (!annot || !(annot instanceof PDFDict)) continue;

              const action = annot.get(PDFName.of('A')) as PDFDict;
              if (!action || !(action instanceof PDFDict)) continue;

              const uri = action.get(PDFName.of('URI'));
              if (uri) {
                const uriStr = uri.toString();
                if (uriStr.includes('lawnation') || uriStr.includes('law-nation') || uriStr.includes(WATERMARK_MARKER.toLowerCase())) {
                  console.log('[Watermark] ⚠️ Existing watermark link annotation detected — skipping re-watermark');
                  return true;
                }
              }
            } catch {
              // Skip unreadable annotations
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Watermark] Could not check for existing watermarks, proceeding with watermark:', err);
  }

  return false;
}

/**
 * Add watermark to PDF with conditional clickable link
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
      ignoreEncryption: true,
      throwOnInvalidObject: false
    });

    // ── NEW: Check for existing watermark before proceeding ──────────────
    const alreadyWatermarked = await isAlreadyWatermarked(pdfDoc);
    if (alreadyWatermarked) {
      console.log('⏭️ [Watermark] PDF already watermarked — returning original bytes unchanged');
      return pdfBytes; // Return the original, untouched PDF
    }
    // ─────────────────────────────────────────────────────────────────────

    const pages = pdfDoc.getPages();
    console.log(`📄 [Watermark] PDF has ${pages.length} pages`);

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

    // 4. Prepare watermark variables
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

        if (index === 0) console.log(`📋 [Watermark] Added citation "${citationNumber}" to all pages`);
      }

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

        if (index === 0) console.log(`© [Watermark] Added copyright notice to all pages`);
      }

      if (includeUrl) {
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

        if (existingAnnots && existingAnnots instanceof PDFArray) {
          annotsArray = [...(existingAnnots as any), linkAnnotationRef];
        } else if (existingAnnots) {
          annotsArray = [existingAnnots, linkAnnotationRef];
        } else {
          annotsArray = [linkAnnotationRef];
        }

        page.node.set(PDFName.of('Annots'), pdfDoc.context.obj(annotsArray));
        if (index === 0) console.log(`✅ [Watermark] Clickable links added to all pages`);
      }
    });

    console.log(`✅ [Watermark] Watermark added to ${pages.length} pages`);

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