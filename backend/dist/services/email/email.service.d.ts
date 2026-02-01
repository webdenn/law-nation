/**
 * Email Service
 * Handles all email sending logic using the adapter pattern
 */
export declare class EmailService {
    private adapter;
    constructor();
    /**
     * Core send email method
     */
    private sendEmail;
    /**
     * Send OTP verification email
     */
    sendOtpEmail(userEmail: string, otp: string): Promise<void>;
    /**
     * Send welcome email after registration
     */
    sendWelcomeEmail(userEmail: string, userName: string): Promise<void>;
    /**
     * Send article submission confirmation
     */
    sendArticleSubmissionConfirmation(authorEmail: string, authorName: string, articleTitle: string, articleId: string): Promise<void>;
    /**
     * Send notification to co-author
     */
    sendCoAuthorNotification(coAuthorEmail: string, coAuthorName: string, primaryAuthorName: string, articleTitle: string, articleId: string): Promise<void>;
    /**
     * Send editor assignment notification to author
     */
    sendAuthorAssignmentNotification(authorEmail: string, authorName: string, articleTitle: string, articleId: string): Promise<void>;
    /**
     * Send article assignment notification to editor
     */
    sendEditorAssignmentNotification(editorEmail: string, editorName: string, articleTitle: string, authorName: string, category: string, articleId: string): Promise<void>;
    /**
     * Send article approval notification
     */
    sendArticleApprovalNotification(authorEmail: string, authorName: string, articleTitle: string, articleId: string): Promise<void>;
    /**
     * Send article correction notification
     */
    sendArticleCorrectionNotification(authorEmail: string, authorName: string, articleTitle: string, articleId: string, editorComments?: string): Promise<void>;
    /**
     * Send article verification email with token
     */
    sendArticleVerificationEmail(authorEmail: string, authorName: string, token: string): Promise<void>;
    /**
     * Send article verification email with code
     */
    sendArticleVerificationCodeEmail(authorEmail: string, authorName: string, code: string): Promise<void>;
    /**
     * Send article published notification
     */
    sendArticlePublishedNotification(uploaderEmail: string, uploaderName: string, articleTitle: string, articleId: string, diffSummary?: string): Promise<void>;
    /**
     * Send editor invitation email
     */
    sendEditorInvitationEmail(editorEmail: string, editorName: string, token: string): Promise<void>;
    /**
     * Send editor approval notification to admin
     */
    sendEditorApprovalNotificationToAdmin(adminEmail: string, adminName: string, articleTitle: string, editorName: string, articleId: string): Promise<void>;
    /**
     * Send editor reassignment notification to old editor
     */
    sendEditorReassignmentNotification(editorEmail: string, editorName: string, articleTitle: string, articleId: string): Promise<void>;
}
export declare const emailService: EmailService;
//# sourceMappingURL=email.service.d.ts.map