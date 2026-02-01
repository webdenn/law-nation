export declare class ArticleHistoryService {
    logAssignment(data: {
        articleId: string;
        editorId: string;
        assignedBy: string;
        reason?: string | undefined;
    }): Promise<{
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
    }>;
    /**
     * Log an editor reassignment
     * Marks old assignment as "reassigned" and creates new "active" assignment
     */
    logReassignment(data: {
        articleId: string;
        oldEditorId: string;
        newEditorId: string;
        assignedBy: string;
        reason?: string | undefined;
    }): Promise<{
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
    }>;
    /**
     * Mark editor assignment as completed (when article is published/rejected)
     */
    markAsCompleted(articleId: string, editorId: string): Promise<void>;
    /**
     * Get complete editor history for an article
     */
    getArticleEditorHistory(articleId: string): Promise<({
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
    })[]>;
    /**
     * Get current active editor for an article
     */
    getCurrentEditor(articleId: string): Promise<({
        editor: {
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
    }) | null>;
    /**
     * Get all articles assigned to an editor (current and past)
     */
    getEditorAssignments(editorId: string, status?: string): Promise<({
        article: {
            id: string;
            authorName: string;
            title: string;
            category: string;
            status: import("@prisma/client").$Enums.ArticleStatus;
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
    })[]>;
    /**
     * Get reassignment statistics
     */
    getReassignmentStats(): Promise<{
        totalReassignments: number;
        reassignmentsByAdmin: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.ArticleEditorHistoryGroupByOutputType, "assignedBy"[]> & {
            _count: number;
        })[];
        mostReassignedArticles: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.ArticleEditorHistoryGroupByOutputType, "articleId"[]> & {
            _count: number;
        })[];
        editorsWithMostReassignments: (import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.ArticleEditorHistoryGroupByOutputType, "editorId"[]> & {
            _count: number;
        })[];
    }>;
    /**
     * Get editor performance metrics
     */
    getEditorPerformance(editorId: string): Promise<{
        editorId: string;
        totalAssignments: number;
        completedAssignments: number;
        reassignedAssignments: number;
        activeAssignments: number;
        completionRate: number;
        reassignmentRate: number;
        avgCompletionDays: number;
    }>;
    /**
     * Get reassignment count for an article
     */
    getArticleReassignmentCount(articleId: string): Promise<number>;
}
export declare const articleHistoryService: ArticleHistoryService;
//# sourceMappingURL=article-history.service.d.ts.map