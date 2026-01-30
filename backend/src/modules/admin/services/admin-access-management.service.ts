import { prisma } from "@/db/db.js";
import type { 
  EditorListItem,
  ReviewerListItem,
  AccessRemovalRequest,
  AccessRemovalResponse,
  AccessManagementStats,
  UserAccessHistory
} from "../types/admin-access-management.type.js";
import { NotFoundError, InternalServerError, BadRequestError } from "@/utils/http-errors.util.js";
import { AuditService } from "../../audit/services/audit.service.js";
import { articleWorkflowService } from "../../article/services/article-workflow.service.js";
import { sendAccessRemovalNotification } from "@/utils/email.utils.js";

export class AdminAccessManagementService {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  /**
   * Get all editors with their information for access management
   */
  async getAllEditorsForAccessManagement(
    status: 'ACTIVE' | 'INACTIVE' | 'ALL' = 'ALL',
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<{ editors: EditorListItem[]; total: number; totalPages: number }> {
    try {
      console.log(`📋 [Access Management] Fetching editors - Status: ${status}, Page: ${page}, Limit: ${limit}`);
      
      const offset = (page - 1) * limit;
      
      // Build where clause
      const whereClause: any = {
        userType: 'EDITOR'
      };

      if (status !== 'ALL') {
        whereClause.isActive = status === 'ACTIVE';
      }

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Get total count
      const total = await prisma.user.count({ where: whereClause });

      // Get editors with their article counts
      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          passwordSetupDate: true,
          isActive: true,
          specialization: true,
          title: true,
          designation: true,
          _count: {
            select: {
              assignedArticles: {
                where: {
                  status: {
                    in: ['ASSIGNED_TO_EDITOR', 'EDITOR_IN_PROGRESS']
                  }
                }
              }
            }
          }
        },
        orderBy: [
          { isActive: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset
      });

      // Get completed articles count for each editor
      const editorsWithStats = await Promise.all(
        users.map(async (user) => {
          const completedCount = await prisma.article.count({
            where: {
              assignedEditorId: user.id,
              status: {
                in: ['EDITOR_APPROVED', 'PUBLISHED']
              }
            }
          });

          const editor: EditorListItem = {
            id: user.id,
            name: user.name,
            email: user.email,
            joiningDate: user.passwordSetupDate,
            status: user.isActive ? 'ACTIVE' : 'INACTIVE',
            assignedArticles: user._count.assignedArticles,
            completedArticles: completedCount,
            specialization: user.specialization || [],
            title: user.title,
            designation: user.designation
          };

          return editor;
        })
      );

      const totalPages = Math.ceil(total / limit);

      console.log(`✅ [Access Management] Found ${editorsWithStats.length} editors (${total} total)`);
      return {
        editors: editorsWithStats,
        total,
        totalPages
      };

    } catch (error: any) {
      console.error(`❌ [Access Management] Failed to fetch editors:`, error);
      throw new InternalServerError('Failed to fetch editors for access management');
    }
  }

  /**
   * Get all reviewers with their information for access management
   */
  async getAllReviewersForAccessManagement(
    status: 'ACTIVE' | 'INACTIVE' | 'ALL' = 'ALL',
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<{ reviewers: ReviewerListItem[]; total: number; totalPages: number }> {
    try {
      console.log(`📋 [Access Management] Fetching reviewers - Status: ${status}, Page: ${page}, Limit: ${limit}`);
      
      const offset = (page - 1) * limit;
      
      // Build where clause
      const whereClause: any = {
        userType: 'REVIEWER'
      };

      if (status !== 'ALL') {
        whereClause.isActive = status === 'ACTIVE';
      }

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Get total count
      const total = await prisma.user.count({ where: whereClause });

      // Get reviewers with their review counts
      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          passwordSetupDate: true,
          isActive: true,
          expertise: true,
          qualification: true,
          experience: true,
          _count: {
            select: {
              reviewedArticles: {
                where: {
                  status: {
                    in: ['ASSIGNED_TO_REVIEWER', 'REVIEWER_IN_PROGRESS']
                  }
                }
              }
            }
          }
        },
        orderBy: [
          { isActive: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset
      });

      // Get completed reviews count for each reviewer
      const reviewersWithStats = await Promise.all(
        users.map(async (user) => {
          const completedCount = await prisma.article.count({
            where: {
              assignedReviewerId: user.id,
              status: {
                in: ['REVIEWER_APPROVED', 'PUBLISHED']
              }
            }
          });

          const reviewer: ReviewerListItem = {
            id: user.id,
            name: user.name,
            email: user.email,
            joiningDate: user.passwordSetupDate,
            status: user.isActive ? 'ACTIVE' : 'INACTIVE',
            assignedReviews: user._count.reviewedArticles,
            completedReviews: completedCount,
            expertise: user.expertise || [],
            qualification: user.qualification,
            experience: user.experience
          };

          return reviewer;
        })
      );

      const totalPages = Math.ceil(total / limit);

      console.log(`✅ [Access Management] Found ${reviewersWithStats.length} reviewers (${total} total)`);
      return {
        reviewers: reviewersWithStats,
        total,
        totalPages
      };

    } catch (error: any) {
      console.error(`❌ [Access Management] Failed to fetch reviewers:`, error);
      throw new InternalServerError('Failed to fetch reviewers for access management');
    }
  }

  /**
   * Remove access for editor or reviewer
   */
  async removeUserAccess(
    request: AccessRemovalRequest,
    adminId: string
  ): Promise<AccessRemovalResponse> {
    try {
      console.log(`🚫 [Access Management] Removing access for ${request.userType}: ${request.userId}`);
      
      // Verify user exists and has correct type
      const user = await prisma.user.findUnique({
        where: {
          id: request.userId,
          userType: request.userType
        },
        select: {
          id: true,
          name: true,
          email: true,
          userType: true,
          isActive: true
        }
      });

      if (!user) {
        throw new NotFoundError(`${request.userType} not found`);
      }

      if (!user.isActive) {
        throw new BadRequestError(`${request.userType} access is already removed`);
      }

      // Prevent admin from removing their own access
      if (user.id === adminId) {
        throw new BadRequestError('Cannot remove your own access');
      }

      // Start transaction for access removal and article reassignment
      const result = await prisma.$transaction(async (tx) => {
        // 1. Deactivate user
        await tx.user.update({
          where: { id: request.userId },
          data: { 
            isActive: false,
            updatedAt: new Date()
          }
        });

        // 2. Handle article reassignments using workflow service
        const reassignmentResult = await articleWorkflowService.handleAccessRemovalReassignments(
          request.userId,
          request.userType
        );

        return { user, reassignedArticles: reassignmentResult };
      });

      // 3. Log the access removal in audit
      const adminUser = await prisma.user.findUnique({
        where: { id: adminId },
        select: { name: true, email: true }
      });

      // Create audit event for access removal
      await this.auditService.recordAccessRemoval({
        id: adminId,
        name: adminUser?.name || 'Unknown Admin',
        email: adminUser?.email || 'N/A',
        organization: 'Law-Nation'
      }, {
        id: user.id,
        name: user.name,
        email: user.email,
        userType: user.userType as 'EDITOR' | 'REVIEWER'
      }, request.reason);

      // 4. Send email notification to removed user
      try {
        await sendAccessRemovalNotification(
          user.email,
          user.name,
          user.userType as 'EDITOR' | 'REVIEWER',
          adminUser?.name || 'Administrator',
          request.reason
        );
        console.log(`📧 [Access Management] Email notification sent to ${user.email}`);
      } catch (emailError: any) {
        console.error(`❌ [Access Management] Failed to send email notification:`, emailError);
        // Don't fail the entire operation if email fails
      }

      const response: AccessRemovalResponse = {
        success: true,
        message: `${request.userType} access removed successfully`,
        removedUser: {
          id: user.id,
          name: user.name,
          email: user.email,
          userType: user.userType as 'EDITOR' | 'REVIEWER',
          removedAt: new Date(),
          removedBy: adminId
        }
      };

      if (result.reassignedArticles.reassignedCount > 0) {
        response.reassignedArticles = {
          count: result.reassignedArticles.reassignedCount,
          reassignedTo: []
        };
      }

      console.log(`✅ [Access Management] Successfully removed access for ${user.name} (${result.reassignedArticles.reassignedCount} articles reassigned)`);
      return response;

    } catch (error: any) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      console.error(`❌ [Access Management] Failed to remove user access:`, error);
      throw new InternalServerError('Failed to remove user access');
    }
  }

  /**
   * Get access management statistics
   */
  async getAccessManagementStats(): Promise<AccessManagementStats> {
    try {
      console.log(`📊 [Access Management] Fetching access management statistics`);
      
      // Get editor counts
      const [totalEditors, activeEditors] = await Promise.all([
        prisma.user.count({ where: { userType: 'EDITOR' } }),
        prisma.user.count({ where: { userType: 'EDITOR', isActive: true } })
      ]);

      // Get reviewer counts
      const [totalReviewers, activeReviewers] = await Promise.all([
        prisma.user.count({ where: { userType: 'REVIEWER' } }),
        prisma.user.count({ where: { userType: 'REVIEWER', isActive: true } })
      ]);

      // Get recent removal counts (using updatedAt as proxy for removal date)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const [recentRemovalsWeek, recentRemovalsMonth] = await Promise.all([
        prisma.user.count({
          where: {
            userType: { in: ['EDITOR', 'REVIEWER'] },
            isActive: false,
            updatedAt: { gte: oneWeekAgo }
          }
        }),
        prisma.user.count({
          where: {
            userType: { in: ['EDITOR', 'REVIEWER'] },
            isActive: false,
            updatedAt: { gte: oneMonthAgo }
          }
        })
      ]);

      const stats: AccessManagementStats = {
        totalEditors,
        activeEditors,
        inactiveEditors: totalEditors - activeEditors,
        totalReviewers,
        activeReviewers,
        inactiveReviewers: totalReviewers - activeReviewers,
        recentRemovals: {
          count: recentRemovalsMonth,
          lastWeek: recentRemovalsWeek,
          lastMonth: recentRemovalsMonth
        }
      };

      console.log(`✅ [Access Management] Statistics calculated`);
      return stats;

    } catch (error: any) {
      console.error(`❌ [Access Management] Failed to fetch statistics:`, error);
      throw new InternalServerError('Failed to fetch access management statistics');
    }
  }

  /**
   * Get user access history
   */
  async getUserAccessHistory(userId: string): Promise<UserAccessHistory> {
    try {
      console.log(`📋 [Access Management] Fetching access history for user: ${userId}`);
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          userType: true,
          passwordSetupDate: true,
          isActive: true,
          updatedAt: true,
          _count: {
            select: {
              assignedArticles: true,
              reviewedArticles: true
            }
          }
        }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Get last activity from audit events
      const lastAuditEvent = await prisma.auditEvent.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      });

      const articlesWorkedOn = user.userType === 'EDITOR' 
        ? user._count.assignedArticles 
        : user._count.reviewedArticles;

      const history: UserAccessHistory = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userType: user.userType as 'EDITOR' | 'REVIEWER',
        joiningDate: user.passwordSetupDate,
        removalDate: !user.isActive ? user.updatedAt : null,
        articlesWorkedOn
      };

      if (lastAuditEvent?.createdAt) {
        history.lastActivity = lastAuditEvent.createdAt;
      }

      console.log(`✅ [Access Management] Access history retrieved for ${user.name}`);
      return history;

    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error(`❌ [Access Management] Failed to fetch user access history:`, error);
      throw new InternalServerError('Failed to fetch user access history');
    }
  }
}