import { prisma } from "@/db/db.js";
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from "@/utils/http-errors.util.js";
import { extractPdfContent } from "@/utils/pdf-extract.utils.js";
import {
  ensureBothFormats,
  getFileType,
} from "@/utils/file-conversion.utils.js";
import {
  calculateFileDiff,
  generateDiffSummary,
  getFileTypeFromPath,
} from "@/utils/diff-calculator.utils.js";
import {
  notifyAdminOfEditorApproval,
  notifyUploaderOfPublication,
} from "@/utils/notification.utils.js";
import {
  sendEditorAssignmentNotification,
  sendAuthorAssignmentNotification,
  sendArticleApprovalNotification,
  sendEditorReassignmentNotification,
} from "@/utils/email.utils.js";
import { articleHistoryService } from "../article-history.service.js";
import type {
  AssignEditorData,
  UploadCorrectedPdfData,
} from "../types/article-submission.type.js";

//Article Workflow Service Handles editor assignment, corrections, approvals, and publishing

export class ArticleWorkflowService {
  //Admin assigns editor (handles both first-time assignment and reassignment)

  async assignEditor(
    articleId: string,
    data: AssignEditorData,
    adminId: string
  ) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { assignedEditor: true },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    const allowedStatuses = [
      "PENDING_ADMIN_REVIEW",
      "ASSIGNED_TO_EDITOR",
      "EDITOR_EDITING",
    ];
    if (!allowedStatuses.includes(article.status)) {
      throw new BadRequestError(
        `Cannot assign/reassign editor in current status: ${article.status}`
      );
    }

    if (article.assignedEditorId === data.editorId) {
      throw new BadRequestError("Article is already assigned to this editor");
    }

    const newEditor = await prisma.user.findUnique({
      where: { id: data.editorId },
    });
    if (!newEditor) {
      throw new NotFoundError("Editor not found");
    }

    const isReassignment = !!article.assignedEditorId;
    const oldEditor = article.assignedEditor;

    console.log(
      isReassignment
        ? `🔄 [Reassignment] Article ${articleId}: ${oldEditor?.name} → ${newEditor.name}`
        : `✨ [First Assignment] Article ${articleId}: → ${newEditor.name}`
    );

    if (isReassignment && oldEditor) {
      const preserveWork = data.preserveWork !== false;

      if (!preserveWork) {
        console.log(`🗑️ [Reassignment] Deleting previous editor's work`);
        await prisma.articleRevision.deleteMany({
          where: { articleId, uploadedBy: oldEditor.id },
        });
        await prisma.articleChangeLog.deleteMany({
          where: { articleId, editedBy: oldEditor.id },
        });
        console.log(`✅ [Reassignment] Previous editor's work deleted`);
      } else {
        console.log(`📦 [Reassignment] Preserving previous editor's work`);
      }
    }

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        assignedEditorId: data.editorId,
        status: "ASSIGNED_TO_EDITOR",
      },
      include: { assignedEditor: true },
    });

    if (isReassignment && oldEditor) {
      await articleHistoryService.logReassignment({
        articleId,
        oldEditorId: oldEditor.id,
        newEditorId: data.editorId,
        assignedBy: adminId,
        ...(data.reason && { reason: data.reason }),
      });
    } else {
      await articleHistoryService.logAssignment({
        articleId,
        editorId: data.editorId,
        assignedBy: adminId,
        ...(data.reason && { reason: data.reason }),
      });
    }

    if (isReassignment && oldEditor) {
      sendEditorReassignmentNotification(
        oldEditor.email,
        oldEditor.name,
        article.title,
        article.id
      );
      sendEditorAssignmentNotification(
        newEditor.email,
        newEditor.name,
        article.title,
        article.authorName,
        article.category,
        article.id
      );
      console.log(`ℹ️ [Reassignment] Author not notified (as per policy)`);
    } else {
      sendEditorAssignmentNotification(
        newEditor.email,
        newEditor.name,
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
      if (article.secondAuthorEmail && article.secondAuthorName) {
        sendAuthorAssignmentNotification(
          article.secondAuthorEmail,
          article.secondAuthorName,
          article.title,
          article.id
        );
      }
    }

    return {
      article: updatedArticle,
      isReassignment,
      oldEditor: isReassignment
        ? { id: oldEditor?.id, name: oldEditor?.name, email: oldEditor?.email }
        : null,
      newEditor: {
        id: newEditor.id,
        name: newEditor.name,
        email: newEditor.email,
      },
    };
  }

  //Editor uploads corrected PDF

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

    if (
      article.status !== "ASSIGNED_TO_EDITOR" &&
      article.status !== "EDITOR_EDITING"
    ) {
      throw new BadRequestError(
        "Article is not in correct status for corrections"
      );
    }

    const fileType = getFileType(data.pdfUrl);
    console.log(
      `📄 [Editor Upload] Converting file to both formats: ${data.pdfUrl}`
    );
    const { pdfPath, wordPath } = await ensureBothFormats(data.pdfUrl);

    const oldFilePath = article.currentPdfUrl;
    const newFilePath = pdfPath;

    console.log(`📊 [Diff] Calculating changes...`);
    const diff = await calculateFileDiff(oldFilePath, newFilePath);
    const diffSummary = generateDiffSummary(diff);
    console.log(`✅ [Diff] ${diffSummary}`);

    const lastChangeLog = await prisma.articleChangeLog.findFirst({
      where: { articleId },
      orderBy: { versionNumber: "desc" },
    });
    const versionNumber = (lastChangeLog?.versionNumber || 1) + 1;

    await prisma.articleChangeLog.create({
      data: {
        articleId: article.id,
        versionNumber,
        oldFileUrl: oldFilePath,
        newFileUrl: newFilePath,
        fileType: getFileTypeFromPath(newFilePath),
        diffData: diff as any,
        editedBy: editorId,
        status: "pending",
        ...(data.comments && { comments: data.comments }),
        ...(data.editorDocumentUrl && {
          editorDocumentUrl: data.editorDocumentUrl,
        }),
        ...(data.editorDocumentType && {
          editorDocumentType: data.editorDocumentType,
        }),
      },
    });

    console.log(
      `📝 [Change Log] Created version ${versionNumber} for article ${articleId}`
    );

    let pdfContent = { text: "", html: "", images: [] as string[] };
    try {
      pdfContent = await extractPdfContent(pdfPath, articleId);
    } catch (error) {
      console.error("Failed to extract PDF content:", error);
    }

    await prisma.articleRevision.create({
      data: {
        articleId: article.id,
        pdfUrl: pdfPath,
        wordUrl: wordPath,
        uploadedBy: editorId,
        ...(data.comments && { comments: data.comments }),
      },
    });

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        currentPdfUrl: pdfPath,
        currentWordUrl: wordPath,
        content: pdfContent.text || null,
        contentHtml: pdfContent.html || null,
        imageUrls: pdfContent.images || [],
        status: "EDITOR_EDITING",
        reviewedAt: new Date(),
      },
    });

    console.log(
      `📝 [Editor Upload] Version ${versionNumber} uploaded. No email sent to author.`
    );

    return {
      article: updatedArticle,
      diffSummary,
      versionNumber,
    };
  }

  //Editor approves article (submits for publishing)

  async editorApproveArticle(articleId: string, editorId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { assignedEditor: true },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    if (article.assignedEditorId !== editorId) {
      throw new ForbiddenError("You are not assigned to this article");
    }

    if (
      article.status !== "EDITOR_EDITING" &&
      article.status !== "ASSIGNED_TO_EDITOR"
    ) {
      throw new BadRequestError("Article cannot be approved in current status");
    }

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        status: "EDITOR_APPROVED",
        editorApprovedAt: new Date(),
        reviewedAt: new Date(),
      },
    });

    await prisma.articleChangeLog.updateMany({
      where: { articleId, status: "pending" },
      data: { status: "approved" },
    });

    await notifyAdminOfEditorApproval(
      articleId,
      article.title,
      article.assignedEditor?.name || "Editor"
    );

    console.log(
      `✅ [Editor Approval] Article ${articleId} approved by editor ${editorId}`
    );

    return updatedArticle;
  }

  //Admin approves article directly (without editor)

  async approveArticle(
    articleId: string,
    userId: string,
    userRoles: string[],
    newPdfUrl?: string
  ) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    const isAdmin = userRoles.includes("admin");
    const isAssignedEditor = article.assignedEditorId === userId;

    if (!isAdmin && !isAssignedEditor) {
      throw new ForbiddenError(
        "You do not have permission to approve this article"
      );
    }

    if (!isAdmin) {
      if (
        article.status !== "ASSIGNED_TO_EDITOR" &&
        article.status !== "PENDING_APPROVAL"
      ) {
        throw new BadRequestError(
          "Article cannot be approved in current status"
        );
      }
    } else {
      if (
        article.status !== "PENDING_ADMIN_REVIEW" &&
        article.status !== "ASSIGNED_TO_EDITOR" &&
        article.status !== "PENDING_APPROVAL"
      ) {
        throw new BadRequestError(
          "Article cannot be approved in current status"
        );
      }
    }

    const updateData: any = {
      status: "PUBLISHED",
      approvedAt: new Date(),
      reviewedAt: new Date(),
    };

    if (newPdfUrl) {
      console.log(`♻️ Replacing PDF for article ${articleId} on approval`);
      updateData.currentPdfUrl = newPdfUrl;

      try {
        const pdfContent = await extractPdfContent(newPdfUrl, articleId);
        if (pdfContent.text) {
          updateData.content = pdfContent.text;
          updateData.contentHtml = pdfContent.html;
        }
      } catch (e) {
        console.error("Failed to extract content from new approval PDF", e);
      }
    }

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: updateData,
    });

    sendArticleApprovalNotification(
      article.authorEmail,
      article.authorName,
      article.title,
      article.id
    );

    if (article.secondAuthorEmail && article.secondAuthorName) {
      sendArticleApprovalNotification(
        article.secondAuthorEmail,
        article.secondAuthorName,
        article.title,
        article.id
      );
    }

    return updatedArticle;
  }

  //Admin publishes article (only after editor approval)

  async adminPublishArticle(articleId: string, adminId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { assignedEditor: true },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    if (article.status !== "EDITOR_APPROVED") {
      throw new BadRequestError(
        "Article must be approved by editor before publishing. Current status: " +
          article.status
      );
    }

    let finalDiffSummary = "No changes made";
    let finalDiffData = null;

    if (article.originalPdfUrl !== article.currentPdfUrl) {
      try {
        console.log(
          `📊 [Final Diff] Calculating original vs final for author...`
        );
        const finalDiff = await calculateFileDiff(
          article.originalPdfUrl,
          article.currentPdfUrl
        );
        finalDiffData = finalDiff;
        finalDiffSummary = generateDiffSummary(finalDiff);
        console.log(`✅ [Final Diff] ${finalDiffSummary}`);
      } catch (error) {
        console.error("❌ [Final Diff] Failed to calculate:", error);
        finalDiffSummary = "Changes were made during review";
      }
    } else {
      console.log(
        `ℹ️ [Final Diff] No changes - original and current are the same`
      );
    }

    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        status: "PUBLISHED",
        approvedAt: new Date(),
      },
    });

    await prisma.articleChangeLog.updateMany({
      where: { articleId, status: "approved" },
      data: { status: "published" },
    });

    if (article.assignedEditorId) {
      await articleHistoryService.markAsCompleted(
        articleId,
        article.assignedEditorId
      );
    }

    await notifyUploaderOfPublication(
      articleId,
      article.title,
      article.authorEmail,
      article.authorName,
      finalDiffSummary
    );

    if (article.secondAuthorEmail && article.secondAuthorName) {
      await notifyUploaderOfPublication(
        articleId,
        article.title,
        article.secondAuthorEmail,
        article.secondAuthorName,
        finalDiffSummary
      );
    }

    console.log(
      `✅ [Admin Publish] Article ${articleId} published by admin ${adminId}`
    );

    return {
      article: updatedArticle,
      diffSummary: finalDiffSummary,
    };
  }

  //Delete article (Admin only)

  async deleteArticle(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    await prisma.article.delete({ where: { id: articleId } });

    return { message: "Article deleted successfully" };
  }
}

export const articleWorkflowService = new ArticleWorkflowService();
