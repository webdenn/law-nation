import { prisma } from "@/db/db.js";
import type {
  Editor,
  EditorStats,
  EditorWorkload,
  CreateEditorData,
  UpdateEditorData
} from "../types/admin-editor.type.js";
import { NotFoundError, InternalServerError } from "@/utils/http-errors.util.js";

export class AdminEditorService {

  /**
   * Get all editors with their basic information
   */
  async getAllEditors(): Promise<Editor[]> {
    try {
      console.log(`📋 [Admin Editor] Fetching all editors`);

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { userType: { in: ['EDITOR', 'ADMIN'] } },
            {
              roles: {
                some: {
                  role: {
                    name: { in: ['admin', 'editor', 'ADMIN', 'EDITOR', 'Admin', 'Editor', 'Super Admin', 'Administrator'] }
                  }
                }
              }
            }
          ]
        },
        include: {
          _count: {
            select: {
              assignedArticles: true,
              // We'll need to add completed articles count logic
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const editors: Editor[] = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        title: user.title,
        designation: user.designation,
        specialization: user.specialization || [],
        experience: user.experience,
        bio: user.bio,
        assignedArticles: user._count.assignedArticles,
        completedArticles: 0, // TODO: Calculate from article status
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      console.log(`✅ [Admin Editor] Found ${editors.length} editors`);
      return editors;

    } catch (error: any) {
      console.error(`❌ [Admin Editor] Failed to fetch editors:`, error);
      throw new InternalServerError('Failed to fetch editors');
    }
  }

  /**
   * Get editor by ID with detailed information
   */
  async getEditorById(editorId: string): Promise<Editor> {
    try {
      console.log(`🔍 [Admin Editor] Fetching editor: ${editorId}`);

      const user = await prisma.user.findUnique({
        where: {
          id: editorId,
          userType: 'EDITOR'
        },
        include: {
          _count: {
            select: {
              assignedArticles: true
            }
          }
        }
      });

      if (!user) {
        throw new NotFoundError('Editor not found');
      }

      const editor: Editor = {
        id: user.id,
        name: user.name,
        email: user.email,
        title: user.title,
        designation: user.designation,
        specialization: user.specialization || [],
        experience: user.experience,
        bio: user.bio,
        assignedArticles: user._count.assignedArticles,
        completedArticles: 0, // TODO: Calculate from article status
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      console.log(`✅ [Admin Editor] Found editor: ${editor.name}`);
      return editor;

    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error(`❌ [Admin Editor] Failed to fetch editor:`, error);
      throw new InternalServerError('Failed to fetch editor');
    }
  }

  /**
   * Create new editor
   */
  async createEditor(data: CreateEditorData): Promise<Editor> {
    try {
      console.log(`➕ [Admin Editor] Creating new editor: ${data.name}`);

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        throw new Error('Email already exists');
      }

      const user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          userType: 'EDITOR',
          passwordHash: 'temp_password', // TODO: Generate proper password
          title: data.title ?? null,
          designation: data.designation ?? null,
          specialization: data.specialization,
          experience: data.experience ?? null,
          bio: data.bio ?? null,
          isActive: true
        }
      });

      const editor: Editor = {
        id: user.id,
        name: user.name,
        email: user.email,
        title: user.title,
        designation: user.designation,
        specialization: user.specialization || [],
        experience: user.experience,
        bio: user.bio,
        assignedArticles: 0,
        completedArticles: 0,
        status: 'ACTIVE',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      console.log(`✅ [Admin Editor] Created editor: ${editor.name}`);
      return editor;

    } catch (error: any) {
      console.error(`❌ [Admin Editor] Failed to create editor:`, error);
      throw new InternalServerError(`Failed to create editor: ${error.message}`);
    }
  }

  /**
   * Update editor information
   */
  async updateEditor(editorId: string, data: UpdateEditorData): Promise<Editor> {
    try {
      console.log(`📝 [Admin Editor] Updating editor: ${editorId}`);

      const user = await prisma.user.update({
        where: {
          id: editorId,
          userType: 'EDITOR'
        },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.title !== undefined && { title: data.title }),
          ...(data.designation !== undefined && { designation: data.designation }),
          ...(data.specialization !== undefined && { specialization: data.specialization }),
          ...(data.experience !== undefined && { experience: data.experience }),
          ...(data.bio !== undefined && { bio: data.bio }),
          ...(data.status !== undefined && { isActive: data.status === 'ACTIVE' })
        },
        include: {
          _count: {
            select: {
              assignedArticles: true
            }
          }
        }
      });

      const editor: Editor = {
        id: user.id,
        name: user.name,
        email: user.email,
        title: user.title,
        designation: user.designation,
        specialization: user.specialization || [],
        experience: user.experience,
        bio: user.bio,
        assignedArticles: user._count.assignedArticles,
        completedArticles: 0, // TODO: Calculate from article status
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      console.log(`✅ [Admin Editor] Updated editor: ${editor.name}`);
      return editor;

    } catch (error: any) {
      console.error(`❌ [Admin Editor] Failed to update editor:`, error);
      throw new InternalServerError('Failed to update editor');
    }
  }

  /**
   * Delete editor (soft delete by setting inactive)
   */
  async deleteEditor(editorId: string): Promise<void> {
    try {
      console.log(`🗑️ [Admin Editor] Deleting editor: ${editorId}`);

      await prisma.user.update({
        where: {
          id: editorId,
          userType: 'EDITOR'
        },
        data: {
          isActive: false
        }
      });

      console.log(`✅ [Admin Editor] Editor deleted (deactivated)`);

    } catch (error: any) {
      console.error(`❌ [Admin Editor] Failed to delete editor:`, error);
      throw new InternalServerError('Failed to delete editor');
    }
  }

  /**
   * Get editor statistics
   */
  async getEditorStats(editorId: string): Promise<EditorStats> {
    try {
      console.log(`📊 [Admin Editor] Fetching stats for editor: ${editorId}`);

      const articles = await prisma.article.findMany({
        where: {
          assignedEditorId: editorId
        },
        select: {
          status: true,
          createdAt: true,
          updatedAt: true
        }
      });

      const totalAssigned = articles.length;
      const totalCompleted = articles.filter(a =>
        ['EDITOR_APPROVED', 'PUBLISHED'].includes(a.status)
      ).length;
      const inProgress = articles.filter(a =>
        ['ASSIGNED_TO_EDITOR', 'EDITOR_IN_PROGRESS'].includes(a.status)
      ).length;

      // Calculate average completion time (simplified)
      const completedArticles = articles.filter(a =>
        ['EDITOR_APPROVED', 'PUBLISHED'].includes(a.status)
      );
      const averageCompletionTime = completedArticles.length > 0
        ? completedArticles.reduce((sum, article) => {
          const days = Math.ceil(
            (article.updatedAt.getTime() - article.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          return sum + days;
        }, 0) / completedArticles.length
        : 0;

      const successRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;

      const stats: EditorStats = {
        totalAssigned,
        totalCompleted,
        inProgress,
        averageCompletionTime: Math.round(averageCompletionTime),
        successRate: Math.round(successRate)
      };

      console.log(`✅ [Admin Editor] Stats calculated for editor`);
      return stats;

    } catch (error: any) {
      console.error(`❌ [Admin Editor] Failed to fetch editor stats:`, error);
      throw new InternalServerError('Failed to fetch editor statistics');
    }
  }

  /**
   * Assign article to editor
   */
  async assignArticleToEditor(articleId: string, editorId: string): Promise<void> {
    try {
      console.log(`📝 [Admin Editor] Assigning article ${articleId} to editor ${editorId}`);

      await prisma.article.update({
        where: { id: articleId },
        data: {
          assignedEditorId: editorId,
          status: 'ASSIGNED_TO_EDITOR'
        }
      });

      console.log(`✅ [Admin Editor] Article assigned successfully`);

    } catch (error: any) {
      console.error(`❌ [Admin Editor] Failed to assign article:`, error);
      throw new InternalServerError('Failed to assign article to editor');
    }
  }

  /**
   * Get editor's current workload
   */
  async getEditorWorkload(editorId: string): Promise<EditorWorkload> {
    try {
      console.log(`📋 [Admin Editor] Fetching workload for editor: ${editorId}`);

      const editor = await prisma.user.findUnique({
        where: { id: editorId },
        select: { name: true }
      });

      if (!editor) {
        throw new NotFoundError('Editor not found');
      }

      const assignments = await prisma.article.findMany({
        where: {
          assignedEditorId: editorId,
          status: {
            in: ['ASSIGNED_TO_EDITOR', 'EDITOR_IN_PROGRESS']
          }
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          status: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      const currentAssignments = assignments.map(article => ({
        articleId: article.id,
        articleTitle: article.title,
        assignedDate: article.createdAt,
        dueDate: undefined as Date | undefined, // TODO: Add due date logic if needed
        status: article.status
      }));

      // Simple workload score based on number of assignments
      const workloadScore = Math.min((assignments.length / 5) * 100, 100); // Max 5 articles = 100%

      const workload: EditorWorkload = {
        editorId,
        editorName: editor.name,
        currentAssignments,
        workloadScore: Math.round(workloadScore)
      };

      console.log(`✅ [Admin Editor] Workload calculated: ${assignments.length} active assignments`);
      return workload;

    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error(`❌ [Admin Editor] Failed to fetch editor workload:`, error);
      throw new InternalServerError('Failed to fetch editor workload');
    }
  }
}