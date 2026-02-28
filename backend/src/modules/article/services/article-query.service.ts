import { prisma } from "@/db/db.js";
import {
  NotFoundError,
  ForbiddenError,
} from "@/utils/http-errors.util.js";
import { extractPdfContent } from "@/utils/pdf-extract.utils.js";
import {
  calculateFileDiff,
  // generateDiffSummary, // COMMENTED: Frontend handles diff calculation
} from "@/utils/diff-calculator.utils.js";
import type { ArticleListFilters } from "../types/article-submission.type.js";

// Ensure URL is available globally for node
import { URL } from 'url';

//Article Query Service Handles listing, getting, and reading articles
export class ArticleQueryService {
  //List articles with filters (Admin/Editor)
  async listArticles(filters: ArticleListFilters) {
    const {
      status,
      category,
      authorEmail,
      assignedEditorId,
      assignedReviewerId,
    } = filters;

    // ✅ Sanitize pagination (ensure they are numbers)
    const page = filters.page ? Math.max(1, parseInt(filters.page as any, 10) || 1) : 1;
    const limit = filters.limit ? Math.max(1, parseInt(filters.limit as any, 10) || 20) : 20;

    const where: any = {};

    // ✅ Handle multi-status filter (comma-separated string)
    if (status) {
      if (typeof status === 'string' && status.includes(',')) {
        where.status = { in: status.split(',').map(s => s.trim()) };
      } else {
        where.status = status;
      }
    }

    if (category) where.category = category;
    if (authorEmail) where.authorEmail = authorEmail;
    if (assignedEditorId) where.assignedEditorId = assignedEditorId;
    if (assignedReviewerId) where.assignedReviewerId = assignedReviewerId;

    // ✅ Handle search
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { authorName: { contains: filters.search, mode: 'insensitive' } },
        { category: { contains: filters.search, mode: 'insensitive' } },
        { citationNumber: { contains: filters.search, mode: 'insensitive' } }, // ✅ Search by citation
      ];
    }

    const skip = (page - 1) * limit;

    // Fetch data first to free up connection
    const articles = await prisma.article.findMany({
      where,
      skip: skip,
      take: limit,
      include: {
        assignedEditor: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Fetch count separately
    const total = await prisma.article.count({ where });

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

  // Helper to generate presigned URL for S3 objects
  private async getPresignedUrl(fileUrl: string): Promise<string> {
    if (!fileUrl) return fileUrl;

    // Check if it's an S3 URL (simple heuristic)
    // Local: starts with /uploads or http://localhost
    // S3: https://bucket.s3.region.amazonaws.com/key or similar
    const isS3 = fileUrl.includes('.s3.') && fileUrl.includes('amazonaws.com');

    if (!isS3) return fileUrl;

    try {
      const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

      const client = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });

      // Extract Key from URL
      // Format: https://bucket.s3.region.amazonaws.com/key
      // or https://s3.region.amazonaws.com/bucket/key (less common for virtual-hosted)

      const bucketName = process.env.AWS_S3_BUCKET_ARTICLES || 'articles-bucket';
      let key = fileUrl;

      // URL decoding might be needed
      try {
        const urlObj = new URL(fileUrl);
        // pathname is /key (if virtual hosted)
        key = urlObj.pathname.substring(1); // remove leading /
        key = decodeURIComponent(key);
      } catch (e) {
        // Fallback or regex if URL parsing fails
        console.warn('Failed to parse URL for key extraction:', e);
      }

      console.log(`🔑 [Presigner] Generating signed URL for key: ${key}`);

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      // Expire in 1 hour (3600 seconds)
      const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
      return signedUrl;

    } catch (error) {
      console.error('❌ [Presigner] Failed to generate presigned URL:', error);
      return fileUrl; // Fallback to original
    }
  }

  //Get single article details (full access - for logged-in users)

  async getArticleById(articleId: string) {
    const article = await prisma.article.findUnique({
      where: {
        id: articleId,
        status: "PUBLISHED",
        isVisible: true, // Only show visible articles to users
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

  //Get article by slug (SEO-friendly URL)

  async getArticleBySlug(slug: string) {
    let article = await prisma.article.findUnique({
      where: {
        slug: slug,
        status: "PUBLISHED",
        isVisible: true, // Only show visible articles to users
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

    // Fallback: If not found by slug, it might be an ID
    if (!article) {
      article = await prisma.article.findUnique({
        where: {
          id: slug,
          status: "PUBLISHED",
          isVisible: true,
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
    }

    if (!article) {
      throw new NotFoundError("Article not found or not published");
    }

    return article;
  }
  //Get article preview (limited access - for non-logged-in users)
  async getArticlePreview(articleId: string) {
    const article = await prisma.article.findUnique({
      where: {
        id: articleId,
        status: "PUBLISHED",
        isVisible: true, // Only show visible articles to users
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
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found or not published");
    }

    return article;
  }
  //Get article content for reading (public endpoint with optional auth)
  // NOTE: Content field now contains text extracted from edited/corrected version during publishing
  async getArticleContent(articleId: string, isAuthenticated: boolean = false) {
    const article = await prisma.article.findUnique({
      where: {
        id: articleId,
        status: "PUBLISHED",
        isVisible: true, // Only show visible articles to users
      },
      select: {
        id: true,
        title: true,
        abstract: true,
        category: true,
        keywords: true,
        authorName: true,
        authorOrganization: true,
        secondAuthorName: true,
        secondAuthorEmail: true,
        content: true,
        contentHtml: true,
        currentPdfUrl: true,
        currentWordUrl: true,
        thumbnailUrl: true,
        imageUrls: true,
        submittedAt: true,
        approvedAt: true,
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found or not published");
    }

    if (!article.content || article.content.trim().length === 0) {
      console.log(
        `⚡ [Lazy Extract] Content missing for article ${articleId}, extracting now...`
      );

      try {
        // Use Adobe PDF extraction instead of old extractPdfContent method
        const { adobeService } = await import('@/services/adobe.service.js');

        try {
          console.log(`🔍 [Lazy Extract] Using Adobe PDF extraction for clean text`);
          const cleanText = await adobeService.extractTextFromPdf(article.currentPdfUrl);

          if (cleanText && cleanText.length > 0) {
            console.log(`✅ [Lazy Extract] Adobe extracted ${cleanText.length} characters`);

            await prisma.article.update({
              where: { id: articleId },
              data: {
                content: cleanText,
                contentHtml: cleanText.replace(/\n/g, '<br>'),
              },
            });

            article.content = cleanText;
            article.contentHtml = cleanText.replace(/\n/g, '<br>');
          } else {
            console.warn(`⚠️ [Lazy Extract] Adobe extraction returned empty text`);
          }
        } catch (adobeError) {
          console.error(`❌ [Lazy Extract] Adobe extraction failed, falling back to old method:`, adobeError);

          // Fallback to old method only if Adobe fails
          const pdfContent = await extractPdfContent(
            article.currentPdfUrl,
            articleId
          );

          if (pdfContent.text && pdfContent.text.length > 0) {
            console.log(
              `✅ [Lazy Extract] Fallback extracted ${pdfContent.text.length} characters and ${pdfContent.images.length} images`
            );

            await prisma.article.update({
              where: { id: articleId },
              data: {
                content: pdfContent.text,
                contentHtml: pdfContent.html,
                imageUrls: pdfContent.images || [],
              },
            });

            article.content = pdfContent.text;
            article.contentHtml = pdfContent.html;
            article.imageUrls = pdfContent.images || [];
          } else {
            console.warn(
              `⚠️ [Lazy Extract] No text extracted (might be scanned PDF)`
            );
          }
        }
      } catch (error) {
        console.error(`❌ [Lazy Extract] Failed:`, error);
      }
    }

    if (!isAuthenticated && article.content) {
      const words = article.content.split(/\s+/);
      const wordLimit = 250;

      if (words.length > wordLimit) {
        const limitedContent = words.slice(0, wordLimit).join(" ") + "...";

        console.log(
          `🔒 [Content Limit] Non-authenticated user - showing ${wordLimit}/${words.length} words`
        );

        return {
          ...article,
          content: limitedContent,
          contentHtml: null,
          isLimited: true,
          totalWords: words.length,
          previewWords: wordLimit,
        };
      }
    }

    console.log(
      `✅ [Full Access] ${isAuthenticated ? "Authenticated" : "Guest"
      } user - full content available`
    );

    return {
      ...article,
      isLimited: false,
    };
  }

  //Get article upload history (revisions)

  async getArticleHistory(articleId: string) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        status: true,
        originalPdfUrl: true,
        currentPdfUrl: true,
        authorName: true,
        authorEmail: true,
        submittedAt: true,
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    const revisions = await prisma.articleRevision.findMany({
      where: { articleId },
      include: {
        article: {
          select: {
            assignedEditor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const revisionsWithEditor = await Promise.all(
      revisions.map(async (rev) => {
        let editorInfo = null;
        if (rev.uploadedBy) {
          const editor = await prisma.user.findUnique({
            where: { id: rev.uploadedBy },
            select: {
              id: true,
              name: true,
              email: true,
            },
          });
          editorInfo = editor;
        }
        return {
          ...rev,
          uploadedByUser: editorInfo,
        };
      })
    );

    const history = [
      {
        version: 1,
        type: "original",
        uploadedBy: {
          name: article.authorName,
          email: article.authorEmail,
          role: "Author",
        },
        uploadedAt: article.submittedAt,
        pdfUrl: article.originalPdfUrl,
        comments: null,
        isCurrent: article.currentPdfUrl === article.originalPdfUrl,
      },
      ...revisionsWithEditor.map((rev, index) => ({
        version: index + 2,
        type: "revision",
        uploadedBy: {
          id: rev.uploadedByUser?.id,
          name: rev.uploadedByUser?.name || "Unknown Editor",
          email: rev.uploadedByUser?.email,
          role: "Editor",
        },
        uploadedAt: rev.createdAt,
        pdfUrl: rev.pdfUrl,
        comments: rev.comments,
        isCurrent: article.currentPdfUrl === rev.pdfUrl,
      })),
    ];

    return {
      article: {
        id: article.id,
        title: article.title,
        status: article.status,
        currentPdfUrl: article.currentPdfUrl,
      },
      history,
      totalVersions: history.length,
    };
  }

  //Get change history for an article

  async getArticleChangeHistory(
    articleId: string,
    userId: string,
    userRoles: string[]
  ) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        status: true,
        assignedEditorId: true,
        assignedReviewerId: true,
        authorEmail: true,
        secondAuthorEmail: true,
        originalPdfUrl: true,
        currentPdfUrl: true,
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    const isAdmin = userRoles.includes("admin");
    const isAssignedEditor = article.assignedEditorId === userId;
    const isAssignedReviewer = article.assignedReviewerId === userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const isUploader =
      user &&
      (user.email === article.authorEmail ||
        user.email === article.secondAuthorEmail);

    if (!isAdmin && !isAssignedEditor && !isAssignedReviewer && !isUploader) {
      throw new ForbiddenError(
        "You do not have permission to view this article's change history"
      );
    }

    if (
      isUploader &&
      !isAdmin &&
      !isAssignedEditor &&
      !isAssignedReviewer &&
      article.status !== "PUBLISHED"
    ) {
      throw new ForbiddenError(
        "Change history is only available after article is published"
      );
    }

    const changeLogs = await prisma.articleChangeLog.findMany({
      where: { articleId },
      orderBy: { versionNumber: "asc" },
      include: {
        editor: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: { select: { role: { select: { name: true } } } } // Fetch roles correctly via UserRole
          },
        },
      },
    });

    if (isUploader && !isAdmin && !isAssignedEditor && !isAssignedReviewer) {
      try {
        console.log(
          `📊 [Author View] Calculating final diff (original vs current)...`
        );

        const finalDiff = await calculateFileDiff(
          article.originalPdfUrl,
          article.currentPdfUrl
        );

        // const finalDiffSummary = generateDiffSummary(finalDiff); // COMMENTED: Frontend handles diff calculation
        const finalDiffSummary = "Changes made - view in frontend diff viewer";
        console.log(`✅ [Author View] ${finalDiffSummary}`);

        return {
          article: {
            id: article.id,
            title: article.title,
            status: article.status,
            originalPdfUrl: article.originalPdfUrl,
            currentPdfUrl: article.currentPdfUrl,
          },
          finalDiff: {
            totalAdded: finalDiff.summary.totalAdded,
            totalRemoved: finalDiff.summary.totalRemoved,
            totalModified: finalDiff.summary.totalModified,
            summary: finalDiffSummary,
            diffData: finalDiff,
          },
          accessLevel: "uploader",
        };
      } catch (error) {
        console.error(
          "❌ [Author View] Failed to calculate final diff:",
          error
        );

        return {
          article: {
            id: article.id,
            title: article.title,
            status: article.status,
            originalPdfUrl: article.originalPdfUrl,
            currentPdfUrl: article.currentPdfUrl,
          },
          finalDiff: {
            totalAdded: 0,
            totalRemoved: 0,
            totalModified: 0,
            summary: "Changes were made during review",
          },
          accessLevel: "uploader",
        };
      }
    }

    const latestChangeLog = changeLogs[changeLogs.length - 1];
    const latestEditorDocUrl = latestChangeLog?.editorDocumentUrl || null;
    const latestEditorDocType = latestChangeLog?.editorDocumentType || null;



    // Wait for all mappings (presigning)
    const mappedLogs = await Promise.all(changeLogs.map(async (log) => {
      const mappedLog = {
        id: log.id,
        versionNumber: log.versionNumber,
        fileType: log.fileType,
        editedBy: log.editor,
        editedAt: log.editedAt,
        status: log.status,
        comments: log.comments,
        // diffSummary: generateDiffSummary(log.diffData as any), // COMMENTED: Frontend handles diff calculation
        diffSummary: "Changes made - view in frontend diff viewer",
        diffData: log.diffData,
        editorDocumentUrl: log.editorDocumentUrl,
        editorDocumentType: log.editorDocumentType,
        newFileUrl: log.newFileUrl,
        oldFileUrl: log.oldFileUrl,
        pdfUrl: "", // Calculate below
        role: "", // Calculate below
      };

      // 1. Calculate base PDF URL (before presigning)
      let basePdfUrl = log.newFileUrl;
      if (log.fileType === 'DOCX' && log.newFileUrl) {
        // Handle improved workflow naming convention (watermarked DOCX -> PDF)
        if (log.newFileUrl.endsWith('_watermarked.docx')) {
          // 🔧 FIX: Check if it's a reviewer file (don't add "clean" to reviewer files)
          // Reviewer files are named: reviewer_{timestamp}_watermarked.docx
          if (log.newFileUrl.includes('reviewer_')) {
            // Reviewer files: filename_reviewer_watermarked.docx -> filename_reviewer_watermarked.pdf
            basePdfUrl = log.newFileUrl.replace(/_watermarked\.docx$/i, '_watermarked.pdf');
          } else {
            // Editor files: filename_watermarked.docx -> filename_clean_watermarked.pdf
            basePdfUrl = log.newFileUrl.replace(/_watermarked\.docx$/i, '_clean_watermarked.pdf');
          }
        } else {
          basePdfUrl = log.newFileUrl.replace(/\.docx$/i, '.pdf');
        }
      }

      // 2. Presign URL if needed
      mappedLog.pdfUrl = await this.getPresignedUrl(basePdfUrl || "");

      // 3. Determine Role
      const editorId = (log.editor as any)?.id;
      const isAssignedEditor = editorId && editorId === article.assignedEditorId;
      const isAssignedReviewer = editorId && editorId === article.assignedReviewerId;

      if ((log.diffData as any)?.type === 'reviewer_edit' || isAssignedReviewer) {
        mappedLog.role = 'Reviewer';
      } else if (isAssignedEditor) {
        mappedLog.role = 'Editor';
      } else {
        const roles = (log.editor as any).roles?.map((ur: any) => ur.role?.name) || [];
        if (roles.includes('admin') || roles.includes('ADMIN')) {
          mappedLog.role = 'admin';
        } else {
          mappedLog.role = 'Editor';
        }
      }

      return mappedLog;
    }));

    return {
      article: {
        id: article.id,
        title: article.title,
        status: article.status,
        originalPdfUrl: article.originalPdfUrl,
        currentPdfUrl: article.currentPdfUrl,
        editorDocumentUrl: latestEditorDocUrl,
        editorDocumentType: latestEditorDocType,
      },
      changeLogs: mappedLogs,
      totalVersions: changeLogs.length + 1,
      accessLevel: isAdmin ? "admin" : "editor",
    };

  }

  // Get published articles for users (with visibility filter)
  async getPublishedArticles(page = 1, limit = 20, category?: string) {
    const where: any = {
      status: "PUBLISHED",
      isVisible: true, // Only show visible articles to users
    };

    if (category) {
      where.category = category;
    }

    const skip = (page - 1) * limit;

    // Fetch data first
    const articles = await prisma.article.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        abstract: true,
        authorName: true,
        authorOrganization: true,
        keywords: true,
        thumbnailUrl: true,
        submittedAt: true,
        approvedAt: true,
      },
      orderBy: { approvedAt: "desc" },
    });

    // Fetch count separately
    const total = await prisma.article.count({ where });

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

  // Get published articles for admin (no visibility filter)
  async getPublishedArticlesForAdmin(page = 1, limit = 20, category?: string) {
    const where: any = {
      status: "PUBLISHED",
      // No isVisible filter - admin sees all published articles
    };

    if (category) {
      where.category = category;
    }

    const skip = (page - 1) * limit;

    // Fetch data first
    const articles = await prisma.article.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        abstract: true,
        authorName: true,
        authorOrganization: true,
        keywords: true,
        thumbnailUrl: true,
        submittedAt: true,
        approvedAt: true,
        isVisible: true,
        hiddenAt: true,
        hiddenBy: true,
      },
      orderBy: { approvedAt: "desc" },
    });

    // Fetch count separately
    const total = await prisma.article.count({ where });

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

  //Get specific diff details

  async getChangeLogDiff(
    changeLogId: string,
    userId: string,
    userRoles: string[]
  ) {
    const changeLog = await prisma.articleChangeLog.findUnique({
      where: { id: changeLogId },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            assignedEditorId: true,
            assignedReviewerId: true,
            authorEmail: true,
            secondAuthorEmail: true,
          },
        },
        editor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!changeLog) {
      throw new NotFoundError("Change log not found");
    }

    const isAdmin = userRoles.includes("admin");
    const isAssignedEditor = changeLog.article.assignedEditorId === userId;

    const isAssignedReviewer = changeLog.article.assignedReviewerId === userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const isUploader =
      user &&
      (user.email === changeLog.article.authorEmail ||
        user.email === changeLog.article.secondAuthorEmail);

    if (!isAdmin && !isAssignedEditor && !isAssignedReviewer && !isUploader) {
      throw new ForbiddenError(
        "You do not have permission to view this change log"
      );
    }

    return {
      id: changeLog.id,
      articleId: changeLog.articleId,
      articleTitle: changeLog.article.title,
      versionNumber: changeLog.versionNumber,
      fileType: changeLog.fileType,
      oldFileUrl: changeLog.oldFileUrl,
      newFileUrl: changeLog.newFileUrl,
      diffData: changeLog.diffData,
      editedBy: changeLog.editor,
      editedAt: changeLog.editedAt,
      status: changeLog.status,
      comments: changeLog.comments,
      editorDocumentUrl: changeLog.editorDocumentUrl,
      editorDocumentType: changeLog.editorDocumentType,
    };
  }

  //Get editor assignment history for an article

  async getEditorAssignmentHistory(
    articleId: string,
    userId: string,
    userRoles: string[]
  ) {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        status: true,
        assignedEditorId: true,
      },
    });

    if (!article) {
      throw new NotFoundError("Article not found");
    }

    const isAdmin = userRoles.includes("admin");
    if (!isAdmin) {
      throw new ForbiddenError(
        "Only admins can view editor assignment history"
      );
    }

    const { articleHistoryService } = await import(
      "../article-history.service.js"
    );
    const history = await articleHistoryService.getArticleEditorHistory(
      articleId
    );

    return {
      article: {
        id: article.id,
        title: article.title,
        status: article.status,
        currentEditorId: article.assignedEditorId,
      },
      history,
      totalAssignments: history.length,
    };
  }

  /**
   * Search article by citation number
   * @param citationNumber - Citation number to search for
   * @returns Article with matching citation number
   */
  async searchByCitation(citationNumber: string) {
    if (!citationNumber || citationNumber.trim() === '') {
      throw new NotFoundError('Citation number is required');
    }

    const article = await prisma.article.findUnique({
      where: { 
        citationNumber: citationNumber.trim(),
        status: 'PUBLISHED' // Only search published articles
      },
      select: {
        id: true,
        title: true,
        slug: true,
        authorName: true,
        category: true,
        abstract: true,
        citationNumber: true,
        currentPdfUrl: true,
        thumbnailUrl: true,
        approvedAt: true,
        submittedAt: true,
        isVisible: true,
      }
    });

    if (!article) {
      throw new NotFoundError(`No published article found with citation number: ${citationNumber}`);
    }

    if (!article.isVisible) {
      throw new ForbiddenError('This article is currently not visible');
    }

    return article;
  }
}

export const articleQueryService = new ArticleQueryService();
