import { prisma } from "@/db/db.js";
import type { 
  Reviewer, 
  ReviewerStats, 
  ReviewerWorkload, 
  CreateReviewerData, 
  UpdateReviewerData 
} from "../types/admin-reviewer.type.js";
import { NotFoundError, InternalServerError } from "@/utils/http-errors.util.js";

export class AdminReviewerService {
  
  /**
   * Get all reviewers with their basic information
   */
  async getAllReviewers(): Promise<Reviewer[]> {
    try {
      console.log(`📋 [Admin Reviewer] Fetching all reviewers`);
      
      const users = await prisma.user.findMany({
        where: {
          userType: 'REVIEWER'
        },
        include: {
          _count: {
            select: {
              reviewedArticles: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const reviewers: Reviewer[] = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        expertise: user.expertise || [],
        qualification: user.qualification,
        experience: user.experience,
        bio: user.bio,
        assignedReviews: 0, // TODO: Calculate current assigned reviews
        completedReviews: user._count.reviewedArticles,
        averageReviewTime: 0, // TODO: Calculate from review history
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      console.log(`✅ [Admin Reviewer] Found ${reviewers.length} reviewers`);
      return reviewers;

    } catch (error: any) {
      console.error(`❌ [Admin Reviewer] Failed to fetch reviewers:`, error);
      throw new InternalServerError('Failed to fetch reviewers');
    }
  }

  /**
   * Get reviewer by ID with detailed information
   */
  async getReviewerById(reviewerId: string): Promise<Reviewer> {
    try {
      console.log(`🔍 [Admin Reviewer] Fetching reviewer: ${reviewerId}`);
      
      const user = await prisma.user.findUnique({
        where: {
          id: reviewerId,
          userType: 'REVIEWER'
        },
        include: {
          _count: {
            select: {
              reviewedArticles: true
            }
          }
        }
      });

      if (!user) {
        throw new NotFoundError('Reviewer not found');
      }

      const reviewer: Reviewer = {
        id: user.id,
        name: user.name,
        email: user.email,
        expertise: user.expertise || [],
        qualification: user.qualification,
        experience: user.experience,
        bio: user.bio,
        assignedReviews: 0, // TODO: Calculate current assigned reviews
        completedReviews: user._count.reviewedArticles,
        averageReviewTime: 0, // TODO: Calculate from review history
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      console.log(`✅ [Admin Reviewer] Found reviewer: ${reviewer.name}`);
      return reviewer;

    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error(`❌ [Admin Reviewer] Failed to fetch reviewer:`, error);
      throw new InternalServerError('Failed to fetch reviewer');
    }
  }

  /**
   * Create new reviewer
   */
  async createReviewer(data: CreateReviewerData): Promise<Reviewer> {
    try {
      console.log(`➕ [Admin Reviewer] Creating new reviewer: ${data.name}`);
      
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
          userType: 'REVIEWER',
          passwordHash: 'temp_password', // TODO: Generate proper password
          expertise: data.expertise,
          qualification: data.qualification ?? null,
          experience: data.experience ?? null,
          bio: data.bio ?? null,
          isActive: true
        }
      });

      const reviewer: Reviewer = {
        id: user.id,
        name: user.name,
        email: user.email,
        expertise: user.expertise || [],
        qualification: user.qualification,
        experience: user.experience,
        bio: user.bio,
        assignedReviews: 0,
        completedReviews: 0,
        averageReviewTime: 0,
        status: 'ACTIVE',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      console.log(`✅ [Admin Reviewer] Created reviewer: ${reviewer.name}`);
      return reviewer;

    } catch (error: any) {
      console.error(`❌ [Admin Reviewer] Failed to create reviewer:`, error);
      throw new InternalServerError(`Failed to create reviewer: ${error.message}`);
    }
  }

  /**
   * Update reviewer information
   */
  async updateReviewer(reviewerId: string, data: UpdateReviewerData): Promise<Reviewer> {
    try {
      console.log(`📝 [Admin Reviewer] Updating reviewer: ${reviewerId}`);
      
      const user = await prisma.user.update({
        where: {
          id: reviewerId,
          userType: 'REVIEWER'
        },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.expertise !== undefined && { expertise: data.expertise }),
          ...(data.qualification !== undefined && { qualification: data.qualification }),
          ...(data.experience !== undefined && { experience: data.experience }),
          ...(data.bio !== undefined && { bio: data.bio }),
          ...(data.status !== undefined && { isActive: data.status === 'ACTIVE' })
        },
        include: {
          _count: {
            select: {
              reviewedArticles: true
            }
          }
        }
      });

      const reviewer: Reviewer = {
        id: user.id,
        name: user.name,
        email: user.email,
        expertise: user.expertise || [],
        qualification: user.qualification,
        experience: user.experience,
        bio: user.bio,
        assignedReviews: 0, // TODO: Calculate current assigned reviews
        completedReviews: user._count.reviewedArticles,
        averageReviewTime: 0, // TODO: Calculate from review history
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      console.log(`✅ [Admin Reviewer] Updated reviewer: ${reviewer.name}`);
      return reviewer;

    } catch (error: any) {
      console.error(`❌ [Admin Reviewer] Failed to update reviewer:`, error);
      throw new InternalServerError('Failed to update reviewer');
    }
  }

  /**
   * Delete reviewer (soft delete by setting inactive)
   */
  async deleteReviewer(reviewerId: string): Promise<void> {
    try {
      console.log(`🗑️ [Admin Reviewer] Deleting reviewer: ${reviewerId}`);
      
      await prisma.user.update({
        where: {
          id: reviewerId,
          userType: 'REVIEWER'
        },
        data: {
          isActive: false
        }
      });

      console.log(`✅ [Admin Reviewer] Reviewer deleted (deactivated)`);

    } catch (error: any) {
      console.error(`❌ [Admin Reviewer] Failed to delete reviewer:`, error);
      throw new InternalServerError('Failed to delete reviewer');
    }
  }

  /**
   * Get reviewer statistics
   */
  async getReviewerStats(reviewerId: string): Promise<ReviewerStats> {
    try {
      console.log(`📊 [Admin Reviewer] Fetching stats for reviewer: ${reviewerId}`);
      
      const articles = await prisma.article.findMany({
        where: {
          assignedReviewerId: reviewerId
        },
        select: {
          status: true,
          createdAt: true,
          updatedAt: true
        }
      });

      const totalAssigned = articles.length;
      const totalCompleted = articles.filter(a => 
        ['REVIEWER_APPROVED', 'PUBLISHED'].includes(a.status)
      ).length;
      const inProgress = articles.filter(a => 
        ['ASSIGNED_TO_REVIEWER', 'REVIEWER_IN_PROGRESS'].includes(a.status)
      ).length;

      // Calculate average review time (simplified)
      const completedReviews = articles.filter(a => 
        ['REVIEWER_APPROVED', 'PUBLISHED'].includes(a.status)
      );
      const averageReviewTime = completedReviews.length > 0 
        ? completedReviews.reduce((sum, article) => {
            const days = Math.ceil(
              (article.updatedAt.getTime() - article.createdAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0) / completedReviews.length
        : 0;

      // Simple quality score based on completion rate
      const qualityScore = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;

      const stats: ReviewerStats = {
        totalAssigned,
        totalCompleted,
        inProgress,
        averageReviewTime: Math.round(averageReviewTime),
        qualityScore: Math.round(qualityScore)
      };

      console.log(`✅ [Admin Reviewer] Stats calculated for reviewer`);
      return stats;

    } catch (error: any) {
      console.error(`❌ [Admin Reviewer] Failed to fetch reviewer stats:`, error);
      throw new InternalServerError('Failed to fetch reviewer statistics');
    }
  }

  /**
   * Assign article to reviewer (NEW: Enhanced for post-editor assignment)
   */
  async assignArticleToReviewer(articleId: string, reviewerId: string, adminId: string): Promise<void> {
    try {
      console.log(`📝 [Admin Reviewer] Assigning article ${articleId} to reviewer ${reviewerId} after editor approval`);
      
      // Verify article is in correct state for reviewer assignment
      const article = await prisma.article.findUnique({
        where: { id: articleId },
        select: { status: true, title: true }
      });

      if (!article) {
        throw new NotFoundError('Article not found');
      }

      // NEW: Allow reviewer assignment after editor approval
      const validStatuses = ['EDITOR_APPROVED', 'ASSIGNED_TO_REVIEWER', 'REVIEWER_IN_PROGRESS'];
      if (!validStatuses.includes(article.status)) {
        throw new Error(`Cannot assign reviewer in status: ${article.status}. Must be editor approved first.`);
      }

      await prisma.article.update({
        where: { id: articleId },
        data: {
          assignedReviewerId: reviewerId,
          status: 'ASSIGNED_TO_REVIEWER'
        }
      });

      console.log(`✅ [Admin Reviewer] Article "${article.title}" assigned to reviewer after editor approval`);

    } catch (error: any) {
      console.error(`❌ [Admin Reviewer] Failed to assign article:`, error);
      throw new InternalServerError(`Failed to assign article to reviewer: ${error.message}`);
    }
  }

  /**
   * NEW: Get available reviewers for post-editor assignment
   */
  async getAvailableReviewersForAssignment(): Promise<Reviewer[]> {
    try {
      console.log(`📋 [Admin Reviewer] Fetching available reviewers for assignment`);
      
      const users = await prisma.user.findMany({
        where: {
          userType: 'REVIEWER',
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          expertise: true,
          qualification: true,
          experience: true,
          bio: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: [
          { isActive: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      const reviewers: Reviewer[] = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        expertise: user.expertise || [],
        qualification: user.qualification,
        experience: user.experience,
        bio: user.bio,
        assignedReviews: 0, // Will be calculated separately if needed
        completedReviews: 0, // TODO: Calculate completed reviews
        averageReviewTime: 0, // TODO: Calculate from review history
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      // Sort by workload (fewer active reviews first)
      reviewers.sort((a, b) => a.assignedReviews - b.assignedReviews);

      console.log(`✅ [Admin Reviewer] Found ${reviewers.length} available reviewers`);
      return reviewers;

    } catch (error: any) {
      console.error(`❌ [Admin Reviewer] Failed to fetch available reviewers:`, error);
      throw new InternalServerError('Failed to fetch available reviewers');
    }
  }

  /**
   * Get reviewer's current workload
   */
  async getReviewerWorkload(reviewerId: string): Promise<ReviewerWorkload> {
    try {
      console.log(`📋 [Admin Reviewer] Fetching workload for reviewer: ${reviewerId}`);
      
      const reviewer = await prisma.user.findUnique({
        where: { id: reviewerId },
        select: { name: true }
      });

      if (!reviewer) {
        throw new NotFoundError('Reviewer not found');
      }

      const assignments = await prisma.article.findMany({
        where: {
          assignedReviewerId: reviewerId,
          status: {
            in: ['ASSIGNED_TO_REVIEWER', 'REVIEWER_IN_PROGRESS']
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

      const currentReviews = assignments.map(article => ({
        articleId: article.id,
        articleTitle: article.title,
        assignedDate: article.createdAt,
        dueDate: undefined as Date | undefined, // TODO: Add due date logic if needed
        status: article.status
      }));

      // Simple workload score based on number of reviews
      const workloadScore = Math.min((assignments.length / 3) * 100, 100); // Max 3 reviews = 100%

      const workload: ReviewerWorkload = {
        reviewerId,
        reviewerName: reviewer.name,
        currentReviews,
        workloadScore: Math.round(workloadScore)
      };

      console.log(`✅ [Admin Reviewer] Workload calculated: ${assignments.length} active reviews`);
      return workload;

    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error(`❌ [Admin Reviewer] Failed to fetch reviewer workload:`, error);
      throw new InternalServerError('Failed to fetch reviewer workload');
    }
  }
}