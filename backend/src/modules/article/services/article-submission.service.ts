import { prisma } from "@/db/db.js";
import { VerificationService } from "@/utils/verification.utils.js";
import { extractPdfContent } from "@/utils/pdf-extract.utils.js";
import {
  ensureBothFormats,
  getFileType,
} from "@/utils/file-conversion.utils.js";
import { generateUniqueSlug } from "@/utils/slug.utils.js";
import { BadRequestError } from "@/utils/http-errors.util.js";
import {
  sendArticleSubmissionConfirmation,
  sendArticleVerificationCodeEmail,
  sendCoAuthorNotification,
} from "@/utils/email.utils.js";
import { notifyAdminsOfArticleUpload } from "@/utils/admin-notification.utils.js";
import { adobeService } from "@/services/adobe.service.js";
import type {
  ArticleSubmissionData,
  ArticleVerificationMetadata,
} from "../types/article-submission.type.js";
//Article Submission Service Handles article submission, verification, and creation
export class ArticleSubmissionService {
  //Submit article (works for both guest and logged-in users)

  async submitArticle(data: ArticleSubmissionData, userId?: string) {
    if (userId) {
      return await this.createArticleDirectly(data);
    }
    return await this.createVerificationRecord(data);
  }

  //Create article directly for logged-in users

  private async createArticleDirectly(
    data: ArticleSubmissionData,
  ) {
    const fileType = getFileType(data.pdfUrl);

    console.log(
      `📄 [Logged-in User] Converting file to both formats: ${data.pdfUrl}`
    );
    const { pdfPath, wordPath } = await ensureBothFormats(data.pdfUrl);

    const articleSlug = await generateUniqueSlug(data.title);
    console.log(
      `🔗 [Slug] Generated slug: "${articleSlug}" from title: "${data.title}"`
    );

    const article = await prisma.article.create({
      data: {
        authorName: data.authorName,
        authorEmail: data.authorEmail,
        ...(data.authorPhone && { authorPhone: data.authorPhone }),
        ...(data.authorOrganization && {
          authorOrganization: data.authorOrganization,
        }),
        ...(data.secondAuthorName && {
          secondAuthorName: data.secondAuthorName,
        }),
        ...(data.secondAuthorEmail && {
          secondAuthorEmail: data.secondAuthorEmail,
        }),
        ...(data.secondAuthorPhone && {
          secondAuthorPhone: data.secondAuthorPhone,
        }),
        ...(data.secondAuthorOrganization && {
          secondAuthorOrganization: data.secondAuthorOrganization,
        }),
        title: data.title,
        slug: articleSlug,
        category: data.category,
        abstract: data.abstract,
        keywords: data.keywords || null,
        ...(data.coAuthors && { coAuthors: data.coAuthors }),
        ...(data.remarksToEditor && { remarksToEditor: data.remarksToEditor }),
        originalPdfUrl: pdfPath,
        currentPdfUrl: pdfPath,
        originalWordUrl: wordPath,
        currentWordUrl: wordPath,
        originalFileType: fileType,
        thumbnailUrl: data.thumbnailUrl || null,
        imageUrls: data.imageUrls || [],
        status: "PENDING_ADMIN_REVIEW",
        // NEW: Set content type and document type
        contentType: (data as any).contentType || "ARTICLE",
        documentType: (data as any).documentType || null,
      },
    });

    // NEW: Handle document processing if this is a document upload
    if ((data as any).contentType === 'DOCUMENT') {
      console.log(`📄 [Document] Starting Adobe processing for document ${article.id}`);
      this.processDocumentInBackground(article.id, pdfPath).catch(console.error);
    } else {
      // ✅ REMOVED: Text extraction moved to admin publish time
      console.log(`📝 [Submission] Text extraction will be done when admin publishes the article`);
      
      // Still extract images from PDF for thumbnail purposes
      try {
        const pdfImageContent = await extractPdfContent(pdfPath, article.id);
        const allImageUrls = [
          ...(data.imageUrls || []),
          ...(pdfImageContent.images || []),
        ];

        await prisma.article.update({
          where: { id: article.id },
          data: {
            imageUrls: allImageUrls,
          },
        });
        
        console.log(`🖼️ [Submission] Extracted ${pdfImageContent.images?.length || 0} images from PDF`);
      } catch (error) {
        console.error("Failed to extract images from PDF:", error);
        // Continue without images - not critical for submission
      }
    }

    await sendArticleSubmissionConfirmation(
      data.authorEmail,
      data.authorName,
      data.title,
      article.id
    );

    if (data.secondAuthorEmail) {
      await sendCoAuthorNotification(
        data.secondAuthorEmail,
        data.secondAuthorName || "Co-Author",
        data.authorName,
        data.title,
        article.id
      );
    }

    // 🔥 NEW: Notify all admins of new article upload
    await notifyAdminsOfArticleUpload(
      data.authorName,
      data.authorEmail,
      data.title,
      article.id,
      data.category,
      data.authorOrganization
    );

    return {
      message: "Article submitted successfully!",
      article,
    };
  }

  //Create verification record for guest users

  private async createVerificationRecord(data: ArticleSubmissionData) {
    const { code, expiresAt } =
      await VerificationService.createVerificationRecord(
        data.authorEmail,
        "ARTICLE",
        {
          ...data,
          tempPdfPath: data.pdfUrl,
        } as ArticleVerificationMetadata,
        48,
        true
      );

    await sendArticleVerificationCodeEmail(
      data.authorEmail,
      data.authorName,
      code!
    );

    return {
      message:
        "Verification email sent! Please check your inbox and verify within 48 hours.",
      expiresAt,
    };
  }

  //Confirm article submission after email verification

  async confirmArticleSubmission(token: string) {
    const verification = await VerificationService.verifyToken(token);

    if (!verification.valid) {
      throw new BadRequestError(
        verification.error || "Invalid verification token"
      );
    }

    const metadata =
      verification.data as unknown as ArticleVerificationMetadata;

    let permanentFileUrl = metadata.pdfUrl;
    if (metadata.tempPdfPath && metadata.tempPdfPath.includes("/temp/")) {
      try {
        permanentFileUrl = await VerificationService.moveTempFile(
          metadata.tempPdfPath
        );
      } catch (error) {
        console.error("Failed to move temp file:", error);
      }
    }

    console.log(
      `📄 [Guest Verification] Converting file to both formats: ${permanentFileUrl}`
    );
    const { pdfPath, wordPath } = await ensureBothFormats(permanentFileUrl);

    const articleSlug = await generateUniqueSlug(metadata.title);

    const article = await prisma.article.create({
      data: {
        authorName: metadata.authorName,
        authorEmail: metadata.authorEmail,
        ...(metadata.authorPhone && { authorPhone: metadata.authorPhone }),
        ...(metadata.authorOrganization && {
          authorOrganization: metadata.authorOrganization,
        }),
        ...(metadata.secondAuthorName && {
          secondAuthorName: metadata.secondAuthorName,
        }),
        ...(metadata.secondAuthorEmail && {
          secondAuthorEmail: metadata.secondAuthorEmail,
        }),
        ...(metadata.secondAuthorPhone && {
          secondAuthorPhone: metadata.secondAuthorPhone,
        }),
        ...(metadata.secondAuthorOrganization && {
          secondAuthorOrganization: metadata.secondAuthorOrganization,
        }),
        title: metadata.title,
        slug: articleSlug,
        category: metadata.category,
        abstract: metadata.abstract,
        keywords: metadata.keywords || null,
        ...(metadata.coAuthors && { coAuthors: metadata.coAuthors }),
        ...(metadata.remarksToEditor && {
          remarksToEditor: metadata.remarksToEditor,
        }),
        originalPdfUrl: pdfPath,
        currentPdfUrl: pdfPath,
        originalWordUrl: wordPath,
        currentWordUrl: wordPath,
        originalFileType: getFileType(pdfPath),
        thumbnailUrl: metadata.thumbnailUrl || null,
        imageUrls: metadata.imageUrls || [],
        status: "PENDING_ADMIN_REVIEW",
      },
    });

    // ✅ REMOVED: Text extraction moved to admin publish time
    console.log(`📝 [Token Verification] Text extraction will be done when admin publishes the article`);
    
    // Still extract images from PDF for thumbnail purposes
    try {
      const pdfImageContent = await extractPdfContent(pdfPath, article.id);
      const allImageUrls = [
        ...(metadata.imageUrls || []),
        ...(pdfImageContent.images || []),
      ];

      await prisma.article.update({
        where: { id: article.id },
        data: {
          imageUrls: allImageUrls,
        },
      });
      
      console.log(`🖼️ [Token Verification] Extracted ${pdfImageContent.images?.length || 0} images from PDF`);
    } catch (error) {
      console.error("Failed to extract images from PDF:", error);
      // Continue without images - not critical
    }

    await VerificationService.markAsVerified(token);
    await VerificationService.deleteVerification(token);

    await sendArticleSubmissionConfirmation(
      metadata.authorEmail,
      metadata.authorName,
      metadata.title,
      article.id
    );

    if (metadata.secondAuthorEmail) {
      await sendCoAuthorNotification(
        metadata.secondAuthorEmail,
        metadata.secondAuthorName || "Co-Author",
        metadata.authorName,
        metadata.title,
        article.id
      );
    }

    // 🔥 NEW: Notify all admins of new article upload (guest verification)
    await notifyAdminsOfArticleUpload(
      metadata.authorName,
      metadata.authorEmail,
      metadata.title,
      article.id,
      metadata.category,
      metadata.authorOrganization
    );

    return article;
  }

  //Verify article by code

  async verifyArticleByCode(email: string, code: string) {
    const verification = await VerificationService.verifyCode(email, code);

    if (!verification.valid) {
      throw new BadRequestError(
        verification.error || "Invalid verification code"
      );
    }

    const metadata =
      verification.data as unknown as ArticleVerificationMetadata;

    let permanentFileUrl = metadata.pdfUrl;
    if (metadata.tempPdfPath && metadata.tempPdfPath.includes("/temp/")) {
      try {
        permanentFileUrl = await VerificationService.moveTempFile(
          metadata.tempPdfPath
        );
      } catch (error) {
        console.error("Failed to move temp file:", error);
      }
    }

    console.log(
      `📄 [Code Verification] Converting file to both formats: ${permanentFileUrl}`
    );
    const { pdfPath, wordPath } = await ensureBothFormats(permanentFileUrl);

    const articleSlug = await generateUniqueSlug(metadata.title);

    const article = await prisma.article.create({
      data: {
        authorName: metadata.authorName,
        authorEmail: metadata.authorEmail,
        ...(metadata.authorPhone && { authorPhone: metadata.authorPhone }),
        ...(metadata.authorOrganization && {
          authorOrganization: metadata.authorOrganization,
        }),
        ...(metadata.secondAuthorName && {
          secondAuthorName: metadata.secondAuthorName,
        }),
        ...(metadata.secondAuthorEmail && {
          secondAuthorEmail: metadata.secondAuthorEmail,
        }),
        ...(metadata.secondAuthorPhone && {
          secondAuthorPhone: metadata.secondAuthorPhone,
        }),
        ...(metadata.secondAuthorOrganization && {
          secondAuthorOrganization: metadata.secondAuthorOrganization,
        }),
        title: metadata.title,
        slug: articleSlug,
        category: metadata.category,
        abstract: metadata.abstract,
        keywords: metadata.keywords || null,
        ...(metadata.coAuthors && { coAuthors: metadata.coAuthors }),
        ...(metadata.remarksToEditor && {
          remarksToEditor: metadata.remarksToEditor,
        }),
        originalPdfUrl: pdfPath,
        currentPdfUrl: pdfPath,
        originalWordUrl: wordPath,
        currentWordUrl: wordPath,
        originalFileType: getFileType(pdfPath),
        thumbnailUrl: metadata.thumbnailUrl || null,
        imageUrls: metadata.imageUrls || [],
        status: "PENDING_ADMIN_REVIEW",
      },
    });

    // ✅ REMOVED: Text extraction moved to admin publish time
    console.log(`📝 [Code Verification] Text extraction will be done when admin publishes the article`);
    
    // Still extract images from PDF for thumbnail purposes
    try {
      const pdfImageContent = await extractPdfContent(pdfPath, article.id);
      const allImageUrls = [
        ...(metadata.imageUrls || []),
        ...(pdfImageContent.images || []),
      ];

      await prisma.article.update({
        where: { id: article.id },
        data: {
          imageUrls: allImageUrls,
        },
      });
      
      console.log(`🖼️ [Code Verification] Extracted ${pdfImageContent.images?.length || 0} images from PDF`);
    } catch (error) {
      console.error("Failed to extract images from PDF:", error);
      // Continue without images - not critical
    }

    await VerificationService.markAsVerifiedByCode(email, code);
    await VerificationService.deleteVerificationByCode(email, code);

    await sendArticleSubmissionConfirmation(
      metadata.authorEmail,
      metadata.authorName,
      metadata.title,
      article.id
    );

    if (metadata.secondAuthorEmail) {
      await sendCoAuthorNotification(
        metadata.secondAuthorEmail,
        metadata.secondAuthorName || "Co-Author",
        metadata.authorName,
        metadata.title,
        article.id
      );
    }

    // 🔥 NEW: Notify all admins of new article upload (code verification)
    await notifyAdminsOfArticleUpload(
      metadata.authorName,
      metadata.authorEmail,
      metadata.title,
      article.id,
      metadata.category,
      metadata.authorOrganization
    );

    return {
      message: "Article verified and submitted successfully!",
      article,
    };
  }

  //Resend verification code

  async resendVerificationCode(email: string) {
    const verification = await prisma.emailVerification.findFirst({
      where: {
        email,
        isVerified: false,
        ttl: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      throw new BadRequestError(
        "No pending verification found or verification has expired"
      );
    }

    const metadata = verification.metadata as any;

    await sendArticleVerificationCodeEmail(
      verification.email,
      metadata.authorName,
      verification.verificationCode || ""
    );

    return {
      message: "Verification code resent successfully!",
      expiresAt: verification.ttl,
    };
  }

  /**
   * NEW: Process document in background using Adobe services
   */
  private async processDocumentInBackground(articleId: string, pdfPath: string): Promise<void> {
    try {
      console.log(`⚙️ [Document] Processing document ${articleId} with Adobe services`);

      // 1. Convert PDF to DOCX using Adobe
      const docxPath = pdfPath.replace('.pdf', '.docx');
      await adobeService.convertPdfToDocx(pdfPath, docxPath);

      // 2. Add watermark to DOCX
      const watermarkData = {
        userName: 'LAW NATION USER',
        downloadDate: new Date(),
        articleTitle: 'Document',
        articleId: articleId,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      };

      const watermarkedDocxPath = docxPath.replace('.docx', '_watermarked.docx');
      await adobeService.addWatermarkToDocx(docxPath, watermarkedDocxPath, watermarkData);

      // Update article record with DOCX URL
      await prisma.article.update({
        where: { id: articleId },
        data: {
          currentWordUrl: watermarkedDocxPath,
        },
      });

      // Clean up temporary files
      const fs = await import('fs');
      if (fs.existsSync(docxPath)) {
        fs.unlinkSync(docxPath);
      }

      console.log(`✅ [Document] Adobe processing completed for ${articleId}`);

    } catch (error) {
      console.error(`❌ [Document] Adobe processing failed for ${articleId}:`, error);
      // Document remains in PENDING_ADMIN_REVIEW status for manual handling
    }
  }
}

export const articleSubmissionService = new ArticleSubmissionService();