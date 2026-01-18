/**
 * @deprecated This file is maintained for backward compatibility only.
 * All email functions now use the new EmailService with adapter pattern.
 *
 * New architecture:
 * - Templates: src/templates/email/ (unchanged)
 * - Service: src/services/email/email.service.ts (business logic)
 * - Adapters: src/adapters/email/ (provider implementations)
 *
 * To switch email providers, update EMAIL_PROVIDER in .env
 */
export declare function sendOtpEmail(userEmail: string, otp: string): Promise<void>;
export declare function sendAuthNotification(userEmail: string, userName: string): Promise<void>;
export declare function sendArticleSubmissionConfirmation(authorEmail: string, authorName: string, articleTitle: string, articleId: string): Promise<void>;
export declare function sendCoAuthorNotification(coAuthorEmail: string, coAuthorName: string, primaryAuthorName: string, articleTitle: string, articleId: string): Promise<void>;
export declare function sendAuthorAssignmentNotification(authorEmail: string, authorName: string, articleTitle: string, articleId: string): Promise<void>;
export declare function sendEditorAssignmentNotification(editorEmail: string, editorName: string, articleTitle: string, authorName: string, category: string, articleId: string): Promise<void>;
export declare function sendArticleApprovalNotification(authorEmail: string, authorName: string, articleTitle: string, articleId: string): Promise<void>;
export declare function sendArticleCorrectionNotification(authorEmail: string, authorName: string, articleTitle: string, articleId: string, editorComments?: string): Promise<void>;
export declare function sendArticleVerificationEmail(authorEmail: string, authorName: string, token: string): Promise<void>;
export declare function sendArticleVerificationCodeEmail(authorEmail: string, authorName: string, code: string): Promise<void>;
export declare function sendArticlePublishedNotification(uploaderEmail: string, uploaderName: string, articleTitle: string, articleId: string, diffSummary?: string): Promise<void>;
export declare function sendEditorInvitationEmail(editorEmail: string, editorName: string, token: string): Promise<void>;
export declare function sendEditorApprovalNotificationToAdmin(adminEmail: string, adminName: string, articleTitle: string, editorName: string, articleId: string): Promise<void>;
export declare function sendEditorReassignmentNotification(editorEmail: string, editorName: string, articleTitle: string, articleId: string): Promise<void>;
//# sourceMappingURL=email.utils.d.ts.map