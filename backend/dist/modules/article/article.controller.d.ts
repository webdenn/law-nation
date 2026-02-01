import type { Response, NextFunction } from "express";
import type { AuthRequest } from "@/types/auth-request.js";
export declare class ArticleController {
    submitArticle(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    verifyArticleSubmission(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    verifyArticleByCode(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    resendVerificationCode(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    assignEditor(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    approveArticle(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getPublishedArticles(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    uploadCorrectedPdf(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    listArticles(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getArticlePreview(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getArticleById(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getArticleBySlug(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getArticleContentBySlug(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    downloadArticlePdf(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    downloadArticleWord(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    downloadOriginalDocx(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    downloadEditorDocx(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deleteArticle(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getArticleContent(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getArticleHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    searchArticles(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    uploadThumbnail(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    uploadImages(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    editorApproveArticle(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    adminPublishArticle(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getArticleChangeHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getChangeLogDiff(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    downloadDiff(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    downloadEditorDocument(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getEditorAssignmentHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    viewVisualDiff(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    uploadEditedDocx(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    extractDocumentText(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const articleController: ArticleController;
//# sourceMappingURL=article.controller.d.ts.map