import { prisma } from "@/db/db.js";
import { NotFoundError, BadRequestError, ForbiddenError } from "@/utils/http-errors.util.js";
import {
  sendArticleSubmissionConfirmation,
  sendEditorAssignmentNotification,
  sendAuthorAssignmentNotification,
  sendArticleApprovalNotification,
  sendArticleCorrectionNotification,
} from "@/utils/email.utils.js";
import type {
  ArticleSubmissionData,
  ArticleListFilters,
  AssignEditorData,
  UploadCorrectedPdfData,
} from "./types/article-submission.type.js";

export class ArticleService {
  // Step 1: Guest submits article
  async submitArticle(data: ArticleSubmissionData) {
    const article = await prisma.article.create({
      data: {
        authorName: data.authorName,
        authorEmail: data.authorEmail,
        ...(data.authorPhone && { authorPhone: data.authorPhone }),
        ...(data.authorOrganization && { authorOrganization: data.authorOrganization }),
        title: data.title,
        category: data.category,
        abstract: data.abstract,
        ...(data.keywords && { keywords: data.keywords }),
        ...(data.coAuthors && { coAuthors: data.coAuthors }),
        ...(data.remarksToEditor && { remarksToEditor: data.remarksToEditor }),
        originalPdfUrl: data.pdfUrl,
        currentPdfUrl: data.pdfUrl,
        status: "PENDING_ADMIN_REVIEW",
      },
    });

    // Send confirmation email
    sendArticleSubmissionConfirmation(
      data.authorEmail,
      data.authorName,
      data.title,
      article.id
    );

    return article;
  }

  // Step 2: Admin assigns editor
  async assignEditor(articleId: string, data: AssignEditorData, adminId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    if (article.status !== "PENDING_ADMIN_REVIEW") {
      throw new BadRequestError("Article is not in pending admin review status");
    }

    const editor = await prisma.user.findUnique({
      where: { id: data.editorId },
    });

    if (!editor) {
      throw new NotFoundError("Editor not found");
    }

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        assignedEditorId: data.editorId,
        status: "ASSIGNED_TO_EDITOR",
      },
      include: {
        assignedEditor: true,
      },
    });

    // Send emails
    sendEditorAssignmentNotification(
      editor.email,
      editor.name,
      article.title,
      article.authorName,
      article.category,
      article.id
    );

    sendAuthorAssignmentNotification(
      article.authorEmail,
      article.authorName,
      article.title,
      article.id
    );

    return updatedArticle;
  }

  // Step 3 - Option A: Editor approves directly
  async approveArticle(articleId: string, editorId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    if (article.assignedEditorId !== editorId) {
      throw new ForbiddenError("You are not assigned to this article");
    }

    if (
      article.status !== "ASSIGNED_TO_EDITOR" &&
      article.status !== "PENDING_APPROVAL"
    ) {
      throw new BadRequestError("Article cannot be approved in current status");
    }

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        reviewedAt: new Date(),
      },
    });

    // Send approval email
    sendArticleApprovalNotification(
      article.authorEmail,
      article.authorName,
      article.title,
      article.id
    );

    return updatedArticle;
  }

  // Step 3 - Editor uploads corrected PDF
  async uploadCorrectedPdf(
    articleId: string,
    editorId: string,
    data: UploadCorrectedPdfData
  ) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    if (article.assignedEditorId !== editorId) {
      throw new ForbiddenError("You are not assigned to this article");
    }

    if (article.status !== "ASSIGNED_TO_EDITOR") {
      throw new BadRequestError("Article is not in correct status for corrections");
    }

    // Create revision record
    await prisma.articleRevision.create({
      data: {
        articleId: article.id,
        pdfUrl: data.pdfUrl,
        uploadedBy: editorId,
        ...(data.comments && { comments: data.comments }),
      },
    });

    // Update article with corrected PDF
    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        currentPdfUrl: data.pdfUrl,
        status: "PENDING_APPROVAL",
        reviewedAt: new Date(),
      },
    });

    // Send correction notification
    sendArticleCorrectionNotification(
      article.authorEmail,
      article.authorName,
      article.title,
      article.id,
      data.comments
    );

    return updatedArticle;
  }

  // List articles with filters (Admin/Editor)
  async listArticles(filters: ArticleListFilters) {
    const { status, category, authorEmail, assignedEditorId, page = 1, limit = 20 } = filters;

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (authorEmail) where.authorEmail = authorEmail;
    if (assignedEditorId) where.assignedEditorId = assignedEditorId;

    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: limit,
        include: {
          assignedEditor: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.article.count({ where }),
    ]);

    return {
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get single article details (full access - for logged-in users)
  async getArticleById(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { 
        id: articleId,
        status: "APPROVED"  // Only show approved articles
      },
      include: {
        assignedEditor: {
          select: { id: true, name: true, email: true },
        },
        revisions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found or not published");
    }

    return article;
  }

  // Get article preview (limited access - for non-logged-in users)
  async getArticlePreview(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { 
        id: articleId, 
        status: "APPROVED" // Only show approved articles
      },
      select: {
        id: true,
        title: true,
        category: true,
        abstract: true,
        authorName: true,
        authorOrganization: true,
        keywords: true,
        submittedAt: true,
        // NO PDF URLs - this is the key difference
        // NO revisions
        // NO assigned editor
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found or not published");
    }

    return article;
  }

  // Get PDF URL for download (for logged-in users)
  async getArticlePdfUrl(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { 
        id: articleId, 
        status: "APPROVED" 
      },
      select: { 
        currentPdfUrl: true,
        title: true 
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found or not published");
    }

    return article;
  }

  // Delete article (Admin only)
  async deleteArticle(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    await prisma.article.delete({
      where: { id: articleId },
    });

    return { message: "Article deleted successfully" };
  }
}

export const articleService = new ArticleService();
