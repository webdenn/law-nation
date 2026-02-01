import { prisma } from '@/db/db.js';
import { NotFoundError, ForbiddenError } from '../../../utils/http-errors.util.js';

export class AdminArticleVisibilityService {

  /**
   * Toggle article visibility (hide/show from user side)
   * Admin side always shows all articles regardless of visibility
   */
  async toggleArticleVisibility(
    articleId: string,
    isVisible: boolean,
    adminUserId: string
  ) {
    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        isVisible: true,
        status: true,
        authorName: true,
        category: true
      }
    });

    if (!article) {
      throw new NotFoundError('Article not found');
    }

    // Get admin user info for audit
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true
      }
    });

    if (!adminUser) {
      throw new ForbiddenError('Admin user not found');
    }

    // Update article visibility
    const updatedArticle = await prisma.article.update({
      where: { id: articleId },
      data: {
        isVisible,
        hiddenAt: isVisible ? null : new Date(),
        hiddenBy: isVisible ? null : adminUserId
      },
      select: {
        id: true,
        title: true,
        isVisible: true,
        hiddenAt: true,
        hiddenBy: true,
        status: true
      }
    });

    // Create audit log - using a simple audit event creation
    await prisma.auditEvent.create({
      data: {
        eventType: isVisible ? 'ARTICLE_SHOWN' : 'ARTICLE_HIDDEN',
        eventDate: new Date().toISOString().split('T')[0] || new Date().getFullYear() + '-01-01',
        eventTime: new Date().toTimeString().split(' ')[0] || '00:00:00',
        eventYear: new Date().getFullYear(),
        userId: adminUserId,
        userName: adminUser.name,
        userEmail: adminUser.email,
        userOrganization: 'Admin',
        articleId: article.id,
        articleTitle: article.title,
        articleCategory: article.category,
        articleAuthor: article.authorName,
        decisionOutcome: isVisible ? 'SHOWN_TO_USERS' : 'HIDDEN_FROM_USERS'
      }
    });

    return {
      success: true,
      message: `Article ${isVisible ? 'shown to' : 'hidden from'} users successfully`,
      article: updatedArticle
    };
  }

  /**
   * Get visibility statistics for admin dashboard
   */
  async getVisibilityStats() {
    const stats = await prisma.article.groupBy({
      by: ['isVisible'],
      _count: {
        id: true
      },
      where: {
        status: 'PUBLISHED' // Only count published articles
      }
    });

    const visibleCount = stats.find((s: any) => s.isVisible === true)?._count.id || 0;
    const hiddenCount = stats.find((s: any) => s.isVisible === false)?._count.id || 0;

    return {
      totalPublished: visibleCount + hiddenCount,
      visibleToUsers: visibleCount,
      hiddenFromUsers: hiddenCount
    };
  }

  /**
   * Get list of hidden articles for admin
   */
  async getHiddenArticles(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where: {
          isVisible: false,
          status: 'PUBLISHED'
        },
        select: {
          id: true,
          title: true,
          authorName: true,
          category: true,
          hiddenAt: true,
          hiddenBy: true,
          createdAt: true
        },
        orderBy: {
          hiddenAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.article.count({
        where: {
          isVisible: false,
          status: 'PUBLISHED'
        }
      })
    ]);

    return {
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}