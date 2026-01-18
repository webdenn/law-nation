import { z } from "zod";
export declare const articleSubmissionSchema: z.ZodObject<{
    authorName: z.ZodString;
    authorEmail: z.ZodString;
    authorPhone: z.ZodOptional<z.ZodString>;
    authorOrganization: z.ZodOptional<z.ZodString>;
    secondAuthorName: z.ZodOptional<z.ZodString>;
    secondAuthorEmail: z.ZodOptional<z.ZodString>;
    secondAuthorPhone: z.ZodOptional<z.ZodString>;
    secondAuthorOrganization: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    category: z.ZodString;
    abstract: z.ZodString;
    keywords: z.ZodOptional<z.ZodString>;
    coAuthors: z.ZodOptional<z.ZodString>;
    remarksToEditor: z.ZodOptional<z.ZodString>;
    thumbnailUrl: z.ZodOptional<z.ZodString>;
    imageUrls: z.ZodOptional<z.ZodArray<z.ZodString>>;
    recaptchaToken: z.ZodString;
}, z.core.$strip>;
export declare const assignEditorSchema: z.ZodObject<{
    editorId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
    preserveWork: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const articleListQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<{
        PENDING_ADMIN_REVIEW: "PENDING_ADMIN_REVIEW";
        ASSIGNED_TO_EDITOR: "ASSIGNED_TO_EDITOR";
        EDITOR_EDITING: "EDITOR_EDITING";
        EDITOR_APPROVED: "EDITOR_APPROVED";
        PENDING_APPROVAL: "PENDING_APPROVAL";
        APPROVED: "APPROVED";
        REJECTED: "REJECTED";
        PUBLISHED: "PUBLISHED";
    }>>;
    category: z.ZodOptional<z.ZodString>;
    authorEmail: z.ZodOptional<z.ZodString>;
    assignedEditorId: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const uploadCorrectedPdfSchema: z.ZodObject<{
    comments: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=article.validator.d.ts.map