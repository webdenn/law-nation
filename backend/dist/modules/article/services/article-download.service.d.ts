export declare class ArticleDownloadService {
    getArticlePdfUrl(articleId: string): Promise<{
        contentType: import("@prisma/client").$Enums.ContentType;
        title: string;
        currentPdfUrl: string;
    }>;
    getArticleWordUrl(articleId: string): Promise<{
        contentType: import("@prisma/client").$Enums.ContentType;
        title: string;
        currentWordUrl: string | null;
    }>;
    getOriginalDocxUrl(articleId: string): Promise<{
        contentType: import("@prisma/client").$Enums.ContentType;
        title: string;
        status: import("@prisma/client").$Enums.ArticleStatus;
        originalWordUrl: string | null;
    }>;
    downloadOriginalDocxWithWatermark(articleId: string, watermarkData: any): Promise<Buffer<ArrayBufferLike>>;
    getEditorDocxUrl(articleId: string): Promise<{
        contentType: import("@prisma/client").$Enums.ContentType;
        title: string;
        status: import("@prisma/client").$Enums.ArticleStatus;
        assignedEditorId: string | null;
        currentWordUrl: string | null;
    }>;
    downloadEditorDocxWithWatermark(articleId: string, watermarkData: any): Promise<Buffer<ArrayBufferLike>>;
    downloadDiff(changeLogId: string, userId: string, userRoles: string[], format?: "pdf" | "word"): Promise<{
        buffer: Buffer<ArrayBufferLike>;
        filename: string;
        mimeType: string;
    }>;
    downloadEditorDocument(changeLogId: string, userId: string, userRoles: string[], format?: "pdf" | "word"): Promise<{
        filePath: string;
        filename: string;
        mimeType: string;
        needsConversion: boolean;
    }>;
    generateVisualDiff(changeLogId: string): Promise<string>;
}
export declare const articleDownloadService: ArticleDownloadService;
//# sourceMappingURL=article-download.service.d.ts.map