import type { ArticleListFilters } from "../types/article-submission.type.js";
export declare class ArticleQueryService {
    listArticles(filters: ArticleListFilters): Promise<{
        articles: ({
            assignedEditor: {
                id: string;
                name: string;
                email: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            contentType: import("@prisma/client").$Enums.ContentType;
            slug: string;
            authorName: string;
            authorEmail: string;
            authorPhone: string | null;
            authorOrganization: string | null;
            secondAuthorName: string | null;
            secondAuthorEmail: string | null;
            secondAuthorPhone: string | null;
            secondAuthorOrganization: string | null;
            title: string;
            category: string;
            abstract: string;
            keywords: string | null;
            coAuthors: string | null;
            remarksToEditor: string | null;
            originalPdfUrl: string;
            currentPdfUrl: string;
            status: import("@prisma/client").$Enums.ArticleStatus;
            assignedEditorId: string | null;
            editorApprovedAt: Date | null;
            submittedAt: Date;
            reviewedAt: Date | null;
            approvedAt: Date | null;
            content: string | null;
            contentHtml: string | null;
            imageUrls: string[];
            thumbnailUrl: string | null;
            currentWordUrl: string | null;
            originalFileType: string;
            originalWordUrl: string | null;
            documentType: import("@prisma/client").$Enums.DocumentType | null;
            documentStatus: import("@prisma/client").$Enums.DocumentStatus | null;
            docxUrl: string | null;
            editedDocxUrl: string | null;
            finalPdfUrl: string | null;
            extractedText: string | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getArticleById(articleId: string): Promise<{
        assignedEditor: {
            id: string;
            name: string;
            email: string;
        } | null;
        revisions: {
            comments: string | null;
            id: string;
            createdAt: Date;
            articleId: string;
            uploadedBy: string | null;
            pdfUrl: string;
            wordUrl: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        contentType: import("@prisma/client").$Enums.ContentType;
        slug: string;
        authorName: string;
        authorEmail: string;
        authorPhone: string | null;
        authorOrganization: string | null;
        secondAuthorName: string | null;
        secondAuthorEmail: string | null;
        secondAuthorPhone: string | null;
        secondAuthorOrganization: string | null;
        title: string;
        category: string;
        abstract: string;
        keywords: string | null;
        coAuthors: string | null;
        remarksToEditor: string | null;
        originalPdfUrl: string;
        currentPdfUrl: string;
        status: import("@prisma/client").$Enums.ArticleStatus;
        assignedEditorId: string | null;
        editorApprovedAt: Date | null;
        submittedAt: Date;
        reviewedAt: Date | null;
        approvedAt: Date | null;
        content: string | null;
        contentHtml: string | null;
        imageUrls: string[];
        thumbnailUrl: string | null;
        currentWordUrl: string | null;
        originalFileType: string;
        originalWordUrl: string | null;
        documentType: import("@prisma/client").$Enums.DocumentType | null;
        documentStatus: import("@prisma/client").$Enums.DocumentStatus | null;
        docxUrl: string | null;
        editedDocxUrl: string | null;
        finalPdfUrl: string | null;
        extractedText: string | null;
    }>;
    getArticleBySlug(slug: string): Promise<{
        assignedEditor: {
            id: string;
            name: string;
            email: string;
        } | null;
        revisions: {
            comments: string | null;
            id: string;
            createdAt: Date;
            articleId: string;
            uploadedBy: string | null;
            pdfUrl: string;
            wordUrl: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        contentType: import("@prisma/client").$Enums.ContentType;
        slug: string;
        authorName: string;
        authorEmail: string;
        authorPhone: string | null;
        authorOrganization: string | null;
        secondAuthorName: string | null;
        secondAuthorEmail: string | null;
        secondAuthorPhone: string | null;
        secondAuthorOrganization: string | null;
        title: string;
        category: string;
        abstract: string;
        keywords: string | null;
        coAuthors: string | null;
        remarksToEditor: string | null;
        originalPdfUrl: string;
        currentPdfUrl: string;
        status: import("@prisma/client").$Enums.ArticleStatus;
        assignedEditorId: string | null;
        editorApprovedAt: Date | null;
        submittedAt: Date;
        reviewedAt: Date | null;
        approvedAt: Date | null;
        content: string | null;
        contentHtml: string | null;
        imageUrls: string[];
        thumbnailUrl: string | null;
        currentWordUrl: string | null;
        originalFileType: string;
        originalWordUrl: string | null;
        documentType: import("@prisma/client").$Enums.DocumentType | null;
        documentStatus: import("@prisma/client").$Enums.DocumentStatus | null;
        docxUrl: string | null;
        editedDocxUrl: string | null;
        finalPdfUrl: string | null;
        extractedText: string | null;
    }>;
    getArticlePreview(articleId: string): Promise<{
        id: string;
        authorName: string;
        authorOrganization: string | null;
        title: string;
        category: string;
        abstract: string;
        keywords: string | null;
        submittedAt: Date;
    }>;
    getArticleContent(articleId: string, isAuthenticated?: boolean): Promise<{
        content: string;
        contentHtml: null;
        isLimited: boolean;
        totalWords: number;
        previewWords: number;
        id: string;
        authorName: string;
        authorOrganization: string | null;
        title: string;
        category: string;
        abstract: string;
        keywords: string | null;
        currentPdfUrl: string;
        submittedAt: Date;
        approvedAt: Date | null;
        imageUrls: string[];
        thumbnailUrl: string | null;
        currentWordUrl: string | null;
    } | {
        isLimited: boolean;
        id: string;
        authorName: string;
        authorOrganization: string | null;
        title: string;
        category: string;
        abstract: string;
        keywords: string | null;
        currentPdfUrl: string;
        submittedAt: Date;
        approvedAt: Date | null;
        content: string | null;
        contentHtml: string | null;
        imageUrls: string[];
        thumbnailUrl: string | null;
        currentWordUrl: string | null;
    }>;
    getArticleHistory(articleId: string): Promise<{
        article: {
            id: string;
            title: string;
            status: import("@prisma/client").$Enums.ArticleStatus;
            currentPdfUrl: string;
        };
        history: ({
            version: number;
            type: string;
            uploadedBy: {
                id: string | undefined;
                name: string;
                email: string | undefined;
                role: string;
            };
            uploadedAt: Date;
            pdfUrl: string;
            comments: string | null;
            isCurrent: boolean;
        } | {
            version: number;
            type: string;
            uploadedBy: {
                name: string;
                email: string;
                role: string;
            };
            uploadedAt: Date;
            pdfUrl: string;
            comments: null;
            isCurrent: boolean;
        })[];
        totalVersions: number;
    }>;
    getArticleChangeHistory(articleId: string, userId: string, userRoles: string[]): Promise<{
        article: {
            id: string;
            title: string;
            status: import("@prisma/client").$Enums.ArticleStatus;
            originalPdfUrl: string;
            currentPdfUrl: string;
            editorDocumentUrl?: never;
            editorDocumentType?: never;
        };
        finalDiff: {
            totalAdded: number;
            totalRemoved: number;
            totalModified: number;
            summary: string;
            diffData: import("@/utils/diff-calculator.utils.js").DiffResult;
        };
        accessLevel: string;
        changeLogs?: never;
        totalVersions?: never;
    } | {
        article: {
            id: string;
            title: string;
            status: import("@prisma/client").$Enums.ArticleStatus;
            originalPdfUrl: string;
            currentPdfUrl: string;
            editorDocumentUrl?: never;
            editorDocumentType?: never;
        };
        finalDiff: {
            totalAdded: number;
            totalRemoved: number;
            totalModified: number;
            summary: string;
            diffData?: never;
        };
        accessLevel: string;
        changeLogs?: never;
        totalVersions?: never;
    } | {
        article: {
            id: string;
            title: string;
            status: import("@prisma/client").$Enums.ArticleStatus;
            originalPdfUrl: string;
            currentPdfUrl: string;
            editorDocumentUrl: string | null;
            editorDocumentType: string | null;
        };
        changeLogs: {
            id: string;
            versionNumber: number;
            fileType: string;
            editedBy: {
                id: string;
                name: string;
                email: string;
            };
            editedAt: Date;
            status: string;
            comments: string | null;
            diffSummary: string;
            diffData: import("@prisma/client/runtime/client").JsonValue;
            editorDocumentUrl: string | null;
            editorDocumentType: string | null;
        }[];
        totalVersions: number;
        accessLevel: string;
        finalDiff?: never;
    }>;
    getChangeLogDiff(changeLogId: string, userId: string, userRoles: string[]): Promise<{
        id: string;
        articleId: string;
        articleTitle: string;
        versionNumber: number;
        fileType: string;
        oldFileUrl: string;
        newFileUrl: string;
        diffData: import("@prisma/client/runtime/client").JsonValue;
        editedBy: {
            id: string;
            name: string;
            email: string;
        };
        editedAt: Date;
        status: string;
        comments: string | null;
        editorDocumentUrl: string | null;
        editorDocumentType: string | null;
    }>;
    getEditorAssignmentHistory(articleId: string, userId: string, userRoles: string[]): Promise<{
        article: {
            id: string;
            title: string;
            status: import("@prisma/client").$Enums.ArticleStatus;
            currentEditorId: string | null;
        };
        history: ({
            editor: {
                id: string;
                name: string;
                email: string;
            };
            assignedByUser: {
                id: string;
                name: string;
                email: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            assignedAt: Date;
            status: string;
            articleId: string;
            unassignedAt: Date | null;
            reason: string | null;
            editorId: string;
            assignedBy: string;
        })[];
        totalAssignments: number;
    }>;
}
export declare const articleQueryService: ArticleQueryService;
//# sourceMappingURL=article-query.service.d.ts.map