import { prisma } from "@/db/db.js";
import { BadRequestError, NotFoundError } from "@/utils/http-errors.util.js";
import type { TimelineQuery, MetricsQuery } from "./validators/admin-dashboard.validator.js";
import type {
  DashboardSummary,
  TimeMetrics,
  StatusDistribution,
  ArticlesTimelineResponse,
  ArticleTimeline,
} from "./types/admin-dashboard.type.js";

class AdminDashboardService {
  
  /**
   * Get overall dashboard summary
   */
  async getSummary(): Promise<DashboardSummary> {
    try {
      const [
        totalSubmissions,
        published,
        pendingReview,
        underReview,
        approved,
        rejected,
      ] = await Promise.all([
        prisma.article.count(),
        prisma.article.count({ where: { status: 'PUBLISHED' } }),
        prisma.article.count({ where: { status: 'PENDING_ADMIN_REVIEW' } }),
        prisma.article.count({ where: { status: 'ASSIGNED_TO_EDITOR' } }),
        prisma.article.count({ where: { status: 'APPROVED' } }),
        prisma.article.count({ where: { status: 'REJECTED' } }),
      ]);

      return {
        totalSubmissions,
        published,
        pendingReview,
        underReview,
        approved,
        rejected,
      };
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      throw new BadRequestError('Failed to fetch dashboard summary');
    }
  }

  /**
   * Calculate time metrics for article processing
   */
  async getTimeMetrics(query: MetricsQuery): Promise<TimeMetrics> {
    try {
      const whereClause: any = {
        status: 'PUBLISHED',
      };

      if (query.startDate) {
        whereClause.submittedAt = { gte: query.startDate };
      }
      if (query.endDate) {
        whereClause.submittedAt = {
          ...whereClause.submittedAt,
          lte: query.endDate,
        };
      }

      const articles = await prisma.article.findMany({
        where: whereClause,
        select: {
          submittedAt: true,
          reviewedAt: true,
          approvedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (articles.length === 0) {
        return {
          averageDays: {
            submissionToPublished: 0,
            submissionToAssigned: 0,
            assignedToReviewed: 0,
            reviewedToApproved: 0,
            approvedToPublished: 0,
          },
          medianDays: {
            submissionToPublished: 0,
            submissionToAssigned: 0,
            assignedToReviewed: 0,
          },
        };
      }

      // Calculate durations
      const submissionToPublished: number[] = [];
      const submissionToAssigned: number[] = [];
      const assignedToReviewed: number[] = [];
      const reviewedToApproved: number[] = [];
      const approvedToPublished: number[] = [];

      articles.forEach((article) => {
        // Submission to Published (using updatedAt as proxy for publishedAt)
        const daysToPublish = this.daysBetween(article.submittedAt, article.updatedAt);
        if (daysToPublish !== null) submissionToPublished.push(daysToPublish);

        // Submission to Assigned (using createdAt as proxy)
        const daysToAssign = this.daysBetween(article.submittedAt, article.createdAt);
        if (daysToAssign !== null) submissionToAssigned.push(daysToAssign);

        // Assigned to Reviewed
        if (article.reviewedAt) {
          const daysToReview = this.daysBetween(article.createdAt, article.reviewedAt);
          if (daysToReview !== null) assignedToReviewed.push(daysToReview);
        }

        // Reviewed to Approved
        if (article.reviewedAt && article.approvedAt) {
          const daysToApprove = this.daysBetween(article.reviewedAt, article.approvedAt);
          if (daysToApprove !== null) reviewedToApproved.push(daysToApprove);
        }

        // Approved to Published
        if (article.approvedAt) {
          const daysToPublish = this.daysBetween(article.approvedAt, article.updatedAt);
          if (daysToPublish !== null) approvedToPublished.push(daysToPublish);
        }
      });

      return {
        averageDays: {
          submissionToPublished: this.average(submissionToPublished),
          submissionToAssigned: this.average(submissionToAssigned),
          assignedToReviewed: this.average(assignedToReviewed),
          reviewedToApproved: this.average(reviewedToApproved),
          approvedToPublished: this.average(approvedToPublished),
        },
        medianDays: {
          submissionToPublished: this.median(submissionToPublished),
          submissionToAssigned: this.median(submissionToAssigned),
          assignedToReviewed: this.median(assignedToReviewed),
        },
      };
    } catch (error) {
      console.error('Error calculating time metrics:', error);
      throw new BadRequestError('Failed to calculate time metrics');
    }
  }

  /**
   * Get status distribution
   */
  async getStatusDistribution(): Promise<StatusDistribution> {
    try {
      const statusCounts = await prisma.article.groupBy({
        by: ['status'],
        _count: true,
      });

      const total = statusCounts.reduce((sum, item) => sum + item._count, 0);

      if (total === 0) {
        return {
          statusCounts: {},
          percentages: {},
        };
      }

      const counts: Record<string, number> = {};
      const percentages: Record<string, number> = {};

      statusCounts.forEach((item) => {
        counts[item.status] = item._count;
        percentages[item.status] = Math.round((item._count / total) * 100 * 10) / 10;
      });

      return {
        statusCounts: counts,
        percentages,
      };
    } catch (error) {
      console.error('Error fetching status distribution:', error);
      throw new BadRequestError('Failed to fetch status distribution');
    }
  }

  /**
   * Get articles timeline with pagination
   */
  async getArticlesTimeline(query: TimelineQuery): Promise<ArticlesTimelineResponse> {
    try {
      const { page, limit, status, startDate, endDate } = query;
      const skip = (page - 1) * limit;

      const whereClause: any = {};

      if (status) {
        whereClause.status = status;
      }
      if (startDate) {
        whereClause.submittedAt = { gte: startDate };
      }
      if (endDate) {
        whereClause.submittedAt = {
          ...whereClause.submittedAt,
          lte: endDate,
        };
      }

      const [articles, total] = await Promise.all([
        prisma.article.findMany({
          where: whereClause,
          select: {
            id: true,
            title: true,
            status: true,
            authorName: true,
            abstract: true,
            assignedEditorId: true,
            originalPdfUrl: true,
            currentPdfUrl: true,
            submittedAt: true,
            reviewedAt: true,
            approvedAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { submittedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.article.count({ where: whereClause }),
      ]);

      const articlesWithTimeline: ArticleTimeline[] = articles.map((article) => ({
        id: article.id,
        title: article.title,
        status: article.status,
        authorName: article.authorName,
        abstract: article.abstract,
        assignedEditorId: article.assignedEditorId,
        originalPdfUrl: article.originalPdfUrl,
        currentPdfUrl: article.currentPdfUrl,
        timeline: {
          submittedAt: article.submittedAt,
          assignedAt: article.createdAt, // Using createdAt as proxy
          reviewedAt: article.reviewedAt,
          approvedAt: article.approvedAt,
          publishedAt: article.status === 'PUBLISHED' ? article.updatedAt : null,
        },
        durations: this.calculateDurations(article),
      }));

      return {
        articles: articlesWithTimeline,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching articles timeline:', error);
      throw new BadRequestError('Failed to fetch articles timeline');
    }
  }

  /**
   * Helper: Calculate days between two dates
   */
  private daysBetween(start: Date, end: Date | null): number | null {
    if (!end) return null;
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: Calculate average
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return Math.round(sum / numbers.length);
  }

  /**
   * Helper: Calculate median
   */
  private median(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2)
      : sorted[mid] ?? 0;
  }

  /**
   * Helper: Calculate all durations for an article
   */
  private calculateDurations(article: any) {
    const submittedAt = article.submittedAt;
    const assignedAt = article.createdAt; // Using createdAt as proxy
    const reviewedAt = article.reviewedAt;
    const approvedAt = article.approvedAt;
    const publishedAt = article.status === 'PUBLISHED' ? article.updatedAt : null;

    return {
      submissionToAssigned: this.daysBetween(submittedAt, assignedAt),
      assignedToReviewed: assignedAt && reviewedAt ? this.daysBetween(assignedAt, reviewedAt) : null,
      reviewedToApproved: reviewedAt && approvedAt ? this.daysBetween(reviewedAt, approvedAt) : null,
      approvedToPublished: approvedAt && publishedAt ? this.daysBetween(approvedAt, publishedAt) : null,
      totalDays: publishedAt ? this.daysBetween(submittedAt, publishedAt) : null,
    };
  }
}

export const adminDashboardService = new AdminDashboardService();