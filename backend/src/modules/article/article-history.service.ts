// src/modules/article/article-history.service.ts

import { prisma } from "@/db/db.js";

/**
 * Article Editor History Service
 * Tracks all editor assignments and reassignments for audit purposes
 */
export class ArticleHistoryService {
  /**
   * Log a new editor assignment
   */
  async logAssignment(data: {
    articleId: string;
    editorId: string;
    assignedBy: string;
    reason?: string | undefined;
  }) {
    console.log(`📝 [History] Logging assignment: Article ${data.articleId} → Editor ${data.editorId}`);

    const history = await prisma.articleEditorHistory.create({
      data: {
        articleId: data.articleId,
        editorId: data.editorId,
        assignedBy: data.assignedBy,
        reason: data.reason ?? null,
        status: "active",
      },
      include: {
        editor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(`✅ [History] Assignment logged with ID: ${history.id}`);
    return history;
  }

  /**
   * Log an editor reassignment
   * Marks old assignment as "reassigned" and creates new "active" assignment
   */
  async logReassignment(data: {
    articleId: string;
    oldEditorId: string;
    newEditorId: string;
    assignedBy: string;
    reason?: string | undefined;
  }) {
    console.log(
      `📝 [History] Logging reassignment: Article ${data.articleId} | ${data.oldEditorId} → ${data.newEditorId}`
    );

    // Mark old assignment as "reassigned"
    const oldAssignment = await prisma.articleEditorHistory.findFirst({
      where: {
        articleId: data.articleId,
        editorId: data.oldEditorId,
        status: "active",
      },
      orderBy: {
        assignedAt: "desc",
      },
    });

    if (oldAssignment) {
      await prisma.articleEditorHistory.update({
        where: { id: oldAssignment.id },
        data: {
          status: "reassigned",
          unassignedAt: new Date(),
        },
      });
      console.log(`✅ [History] Old assignment marked as reassigned: ${oldAssignment.id}`);
    }

    // Create new active assignment
    const newHistory = await prisma.articleEditorHistory.create({
      data: {
        articleId: data.articleId,
        editorId: data.newEditorId,
        assignedBy: data.assignedBy,
        reason: data.reason ?? null,
        status: "active",
      },
      include: {
        editor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(`✅ [History] New assignment logged with ID: ${newHistory.id}`);
    return newHistory;
  }

  /**
   * Mark editor assignment as completed (when article is published/rejected)
   */
  async markAsCompleted(articleId: string, editorId: string) {
    console.log(`📝 [History] Marking assignment as completed: Article ${articleId}, Editor ${editorId}`);

    const activeAssignment = await prisma.articleEditorHistory.findFirst({
      where: {
        articleId,
        editorId,
        status: "active",
      },
      orderBy: {
        assignedAt: "desc",
      },
    });

    if (activeAssignment) {
      await prisma.articleEditorHistory.update({
        where: { id: activeAssignment.id },
        data: {
          status: "completed",
          unassignedAt: new Date(),
        },
      });
      console.log(`✅ [History] Assignment marked as completed: ${activeAssignment.id}`);
    }
  }

  /**
   * Get complete editor history for an article
   */
  async getArticleEditorHistory(articleId: string) {
    const history = await prisma.articleEditorHistory.findMany({
      where: { articleId },
      orderBy: { assignedAt: "asc" },
      include: {
        editor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return history;
  }

  /**
   * Get current active editor for an article
   */
  async getCurrentEditor(articleId: string) {
    const activeAssignment = await prisma.articleEditorHistory.findFirst({
      where: {
        articleId,
        status: "active",
      },
      orderBy: {
        assignedAt: "desc",
      },
      include: {
        editor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return activeAssignment;
  }

  /**
   * Get all articles assigned to an editor (current and past)
   */
  async getEditorAssignments(editorId: string, status?: string) {
    const where: any = { editorId };
    if (status) {
      where.status = status;
    }

    const assignments = await prisma.articleEditorHistory.findMany({
      where,
      orderBy: { assignedAt: "desc" },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            status: true,
            category: true,
            authorName: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return assignments;
  }

  /**
   * Get reassignment statistics
   */
  async getReassignmentStats() {
    // Total reassignments
    const totalReassignments = await prisma.articleEditorHistory.count({
      where: { status: "reassigned" },
    });

    // Reassignments by admin
    const reassignmentsByAdmin = await prisma.articleEditorHistory.groupBy({
      by: ["assignedBy"],
      where: { status: "reassigned" },
      _count: true,
    });

    // Most reassigned articles
    const mostReassignedArticles = await prisma.articleEditorHistory.groupBy({
      by: ["articleId"],
      where: { status: "reassigned" },
      _count: true,
      orderBy: {
        _count: {
          articleId: "desc",
        },
      },
      take: 10,
    });

    // Editors with most reassignments (lost assignments)
    const editorsWithMostReassignments = await prisma.articleEditorHistory.groupBy({
      by: ["editorId"],
      where: { status: "reassigned" },
      _count: true,
      orderBy: {
        _count: {
          editorId: "desc",
        },
      },
      take: 10,
    });

    return {
      totalReassignments,
      reassignmentsByAdmin,
      mostReassignedArticles,
      editorsWithMostReassignments,
    };
  }

  /**
   * Get editor performance metrics
   */
  async getEditorPerformance(editorId: string) {
    const assignments = await prisma.articleEditorHistory.findMany({
      where: { editorId },
      include: {
        article: {
          select: {
            status: true,
            editorApprovedAt: true,
            approvedAt: true,
          },
        },
      },
    });

    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter((a) => a.status === "completed").length;
    const reassignedAssignments = assignments.filter((a) => a.status === "reassigned").length;
    const activeAssignments = assignments.filter((a) => a.status === "active").length;

    // Calculate average time to complete
    const completedWithTime = assignments.filter(
      (a) => a.status === "completed" && a.unassignedAt && a.assignedAt
    );
    const avgCompletionTime =
      completedWithTime.length > 0
        ? completedWithTime.reduce((sum, a) => {
            const time = a.unassignedAt!.getTime() - a.assignedAt.getTime();
            return sum + time;
          }, 0) / completedWithTime.length
        : 0;

    const avgCompletionDays = avgCompletionTime / (1000 * 60 * 60 * 24);

    return {
      editorId,
      totalAssignments,
      completedAssignments,
      reassignedAssignments,
      activeAssignments,
      completionRate: totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0,
      reassignmentRate: totalAssignments > 0 ? (reassignedAssignments / totalAssignments) * 100 : 0,
      avgCompletionDays: Math.round(avgCompletionDays * 10) / 10,
    };
  }

  /**
   * Get reassignment count for an article
   */
  async getArticleReassignmentCount(articleId: string): Promise<number> {
    const reassignmentCount = await prisma.articleEditorHistory.count({
      where: {
        articleId,
        status: "reassigned",
      },
    });

    return reassignmentCount;
  }
}

export const articleHistoryService = new ArticleHistoryService();
