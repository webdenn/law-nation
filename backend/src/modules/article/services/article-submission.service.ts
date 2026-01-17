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
import type {
  ArticleSubmissionData,
  ArticleVerificationMetadata,
} from "../types/article-submission.type.js";
//Article Submission Service Handles article submission, verification, and creation
export class ArticleSubmissionService {
  //Submit article (works for both guest and logged-in users)

  async submitArticle(data: ArticleSubmissionData, userId?: string) {
    if (userId) {
      return await this.createArticleDirectly(data, userId);
    }
    return await this.createVerificationRecord(data);
  }

  //Create article directly for logged-in users

  private async createArticleDirectly(
    data: ArticleSubmissionData,
    userId: string
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
      },
    });

    console.log(`🔍 [PDF Extract] Starting extraction...`);
    let pdfContent = { text: "", html: "", images: [] as string[] };
    try {
      pdfContent = await extractPdfContent(pdfPath, article.id);
    } catch (error) {
      console.error("Failed to extract PDF content:", error);
    }

    const allImageUrls = [
      ...(data.imageUrls || []),
      ...(pdfContent.images || []),
    ];

    await prisma.article.update({
      where: { id: article.id },
      data: {
        content: pdfContent.text || null,
        contentHtml: pdfContent.html || null,
        imageUrls: allImageUrls,
      },
    });

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

    return {
      message: "Article submitted successfully!",
      article,
    };
  }

  //Create verification record for guest users

  private async createVerificationRecord(data: ArticleSubmissionData) {
    const { token, code, expiresAt } =
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

    let pdfContent = { text: "", html: "", images: [] as string[] };
    try {
      pdfContent = await extractPdfContent(pdfPath, article.id);
    } catch (error) {
      console.error("Failed to extract PDF content:", error);
    }

    const allImageUrls = [
      ...(metadata.imageUrls || []),
      ...(pdfContent.images || []),
    ];

    await prisma.article.update({
      where: { id: article.id },
      data: {
        content: pdfContent.text || null,
        contentHtml: pdfContent.html || null,
        imageUrls: allImageUrls,
      },
    });

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

    let pdfContent = { text: "", html: "", images: [] as string[] };
    try {
      pdfContent = await extractPdfContent(pdfPath, article.id);
    } catch (error) {
      console.error("Failed to extract PDF content:", error);
    }

    const allImageUrls = [
      ...(metadata.imageUrls || []),
      ...(pdfContent.images || []),
    ];

    await prisma.article.update({
      where: { id: article.id },
      data: {
        content: pdfContent.text || null,
        contentHtml: pdfContent.html || null,
        imageUrls: allImageUrls,
      },
    });

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
}

export const articleSubmissionService = new ArticleSubmissionService();
