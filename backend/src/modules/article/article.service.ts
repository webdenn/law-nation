import { articleSubmissionService } from "./services/article-submission.service.js";
import { articleWorkflowService } from "./services/article-workflow.service.js";
import { articleDownloadService } from "./services/article-download.service.js";
import { articleSearchService } from "./services/article-search.service.js";
import { articleQueryService } from "./services/article-query.service.js";
import { articleMediaService } from "./services/article-media.service.js";
import type {
  ArticleSubmissionData,
  ArticleListFilters,
  AssignEditorData,
  UploadCorrectedPdfData,
} from "./types/article-submission.type.js";
//Main service that delegates to specialized services
//This maintains backward compatibility while using the new modular architecture:
//ArticleSubmissionService: Handles submission and verification
//ArticleWorkflowService: Handles editor assignment, corrections, approvals
//ArticleDownloadService: Handles PDF/Word downloads and diffs
//ArticleSearchService: Handles full-text search
//ArticleQueryService: Handles listing and getting articles
//ArticleMediaService: Handles thumbnails and images
export class ArticleService {
  // SUBMISSION
  async submitArticle(data: ArticleSubmissionData, userId?: string) {
    return articleSubmissionService.submitArticle(data, userId);
  }
  async confirmArticleSubmission(token: string) {
    return articleSubmissionService.confirmArticleSubmission(token);
  }
  async verifyArticleByCode(email: string, code: string) {
    return articleSubmissionService.verifyArticleByCode(email, code);
  }
  async resendVerificationCode(email: string) {
    return articleSubmissionService.resendVerificationCode(email);
  }
  // WORKFLOW
  async assignEditor(
    articleId: string,
    data: AssignEditorData,
    adminId: string
  ) {
    return articleWorkflowService.assignEditor(articleId, data, adminId);
  }
  async uploadCorrectedPdf(
    articleId: string,
    editorId: string,
    data: UploadCorrectedPdfData
  ) {
    return articleWorkflowService.uploadCorrectedPdf(articleId, editorId, data);
  }
  async editorApproveArticle(articleId: string, editorId: string) {
    return articleWorkflowService.editorApproveArticle(articleId, editorId);
  }
  async approveArticle(
    articleId: string,
    userId: string,
    userRoles: string[],
    newPdfUrl?: string
  ) {
    return articleWorkflowService.approveArticle(
      articleId,
      userId,
      userRoles,
      newPdfUrl
    );
  }
  async adminPublishArticle(articleId: string, adminId: string) {
    return articleWorkflowService.adminPublishArticle(articleId, adminId);
  }
  async deleteArticle(articleId: string) {
    return articleWorkflowService.deleteArticle(articleId);
  }
  //  DOWNLOADS
  async getArticlePdfUrl(articleId: string) {
    return articleDownloadService.getArticlePdfUrl(articleId);
  }
  async getArticleWordUrl(articleId: string) {
    return articleDownloadService.getArticleWordUrl(articleId);
  }
  async downloadDiff(
    changeLogId: string,
    userId: string,
    userRoles: string[],
    format: "pdf" | "word" = "pdf"
  ) {
    return articleDownloadService.downloadDiff(
      changeLogId,
      userId,
      userRoles,
      format
    );
  }
  async downloadEditorDocument(
    changeLogId: string,
    userId: string,
    userRoles: string[],
    format: "pdf" | "word" = "pdf"
  ) {
    return articleDownloadService.downloadEditorDocument(
      changeLogId,
      userId,
      userRoles,
      format
    );
  }
  async generateVisualDiff(changeLogId: string): Promise<string> {
    return articleDownloadService.generateVisualDiff(changeLogId);
  }
  //  SEARCH
  async searchArticles(
    searchQuery: string,
    filters: {
      category?: string;
      author?: string;
      organization?: string;
      keyword?: string;
      dateFrom?: string;
      dateTo?: string;
      sortBy?: "relevance" | "date" | "title" | "author";
      sortOrder?: "asc" | "desc";
      minScore?: number;
      exclude?: string;
      page?: number;
      limit?: number;
    }
  ) {
    return articleSearchService.searchArticles(searchQuery, filters);
  }
  //  QUERY
  async listArticles(filters: ArticleListFilters) {
    return articleQueryService.listArticles(filters);
  }
  async getArticleById(articleId: string) {
    return articleQueryService.getArticleById(articleId);
  }
  async getArticleBySlug(slug: string) {
    return articleQueryService.getArticleBySlug(slug);
  }
  async getArticlePreview(articleId: string) {
    return articleQueryService.getArticlePreview(articleId);
  }
  async getArticleContent(articleId: string, isAuthenticated: boolean = false) {
    return articleQueryService.getArticleContent(articleId, isAuthenticated);
  }
  async getArticleHistory(articleId: string) {
    return articleQueryService.getArticleHistory(articleId);
  }
  async getArticleChangeHistory(
    articleId: string,
    userId: string,
    userRoles: string[]
  ) {
    return articleQueryService.getArticleChangeHistory(
      articleId,
      userId,
      userRoles
    );
  }
  async getChangeLogDiff(
    changeLogId: string,
    userId: string,
    userRoles: string[]
  ) {
    return articleQueryService.getChangeLogDiff(changeLogId, userId, userRoles);
  }
  async getEditorAssignmentHistory(
    articleId: string,
    userId: string,
    userRoles: string[]
  ) {
    return articleQueryService.getEditorAssignmentHistory(
      articleId,
      userId,
      userRoles
    );
  }
  //  MEDIA
  async uploadThumbnail(articleId: string, thumbnailUrl: string) {
    return articleMediaService.uploadThumbnail(articleId, thumbnailUrl);
  }
  async uploadImages(articleId: string, imageUrls: string[]) {
    return articleMediaService.uploadImages(articleId, imageUrls);
  }
}
export const articleService = new ArticleService();
