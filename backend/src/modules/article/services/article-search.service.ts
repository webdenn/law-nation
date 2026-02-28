import { Prisma, prisma } from "@/db/db.js";

//Article Search Service Handles full-text search with PostgreSQL

export class ArticleSearchService {
  //Search articles using PostgreSQL Full-Text Search with enhanced filters

  async searchArticles(
    searchQuery: string,
    filters: {
      category?: string;
      author?: string;
      organization?: string;
      keyword?: string;
      dateFrom?: string;
      dateTo?: string;
      sortBy?: "relevance" | "date" | "title" | "author";
      sortOrder?: "asc" | "desc";
      minScore?: number;
      exclude?: string;
      citation?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const sortBy = filters.sortBy || "relevance";
    const sortOrder = filters.sortOrder || "desc";
    const minScore = filters.minScore || 0;

    const categoryFilter = filters.category
      ? Prisma.sql`AND category = ${filters.category}`
      : Prisma.empty;

    const authorFilter = filters.author
      ? Prisma.sql`AND "authorName" ILIKE ${"%" + filters.author + "%"}`
      : Prisma.empty;

    const organizationFilter = filters.organization
      ? Prisma.sql`AND "authorOrganization" ILIKE ${
          "%" + filters.organization + "%"
        }`
      : Prisma.empty;

    const keywordFilter = filters.keyword
      ? Prisma.sql`AND keywords ILIKE ${"%" + filters.keyword + "%"}`
      : Prisma.empty;

    let dateFilter = Prisma.empty;
    if (filters.dateFrom && filters.dateTo) {
      dateFilter = Prisma.sql`AND "approvedAt" BETWEEN ${filters.dateFrom}::timestamp AND ${filters.dateTo}::timestamp`;
    } else if (filters.dateFrom) {
      dateFilter = Prisma.sql`AND "approvedAt" >= ${filters.dateFrom}::timestamp`;
    } else if (filters.dateTo) {
      dateFilter = Prisma.sql`AND "approvedAt" <= ${filters.dateTo}::timestamp`;
    }

    const excludeFilter = filters.exclude
      ? Prisma.sql`AND NOT (
          title ILIKE ${"%" + filters.exclude + "%"} OR
          abstract ILIKE ${"%" + filters.exclude + "%"} OR
          keywords ILIKE ${"%" + filters.exclude + "%"}
        )`
      : Prisma.empty;
    
    const citationFilter = filters.citation
      ? Prisma.sql`AND "citationNumber" ILIKE ${"%" + filters.citation + "%"}`
      : Prisma.empty;

    const minScoreFilter =
      minScore > 0 ? Prisma.sql`AND relevance >= ${minScore}` : Prisma.empty;

    let orderByClause;
    switch (sortBy) {
      case "date":
        orderByClause = Prisma.sql`ORDER BY "approvedAt" ${Prisma.raw(
          sortOrder.toUpperCase()
        )}`;
        break;
      case "title":
        orderByClause = Prisma.sql`ORDER BY title ${Prisma.raw(
          sortOrder.toUpperCase()
        )}`;
        break;
      case "author":
        orderByClause = Prisma.sql`ORDER BY "authorName" ${Prisma.raw(
          sortOrder.toUpperCase()
        )}`;
        break;
      case "relevance":
      default:
        orderByClause = Prisma.sql`ORDER BY relevance ${Prisma.raw(
          sortOrder.toUpperCase()
        )}, "approvedAt" DESC`;
        break;
    }

    const searchResults = await prisma.$queryRaw<any[]>`
      SELECT 
        id, 
        title,
        slug,
        abstract, 
        category, 
        keywords, 
        "authorName", 
        "authorOrganization", 
        "submittedAt",
        "approvedAt",
        "citationNumber",
        ts_rank(
          to_tsvector('english', 
            coalesce(title, '') || ' ' || 
            coalesce(abstract, '') || ' ' || 
            coalesce(keywords, '') || ' ' ||
            coalesce(category, '') || ' ' ||
            coalesce("authorName", '') || ' ' ||
            coalesce("citationNumber", '')
          ),
          plainto_tsquery('english', ${searchQuery})
        ) as relevance
      FROM "Article"
      WHERE status = 'PUBLISHED'
        AND "isVisible" = true
        AND to_tsvector('english', 
          coalesce(title, '') || ' ' || 
          coalesce(abstract, '') || ' ' || 
          coalesce(keywords, '') || ' ' ||
          coalesce(category, '') || ' ' ||
          coalesce("authorName", '') || ' ' ||
          coalesce("citationNumber", '')
        ) @@ plainto_tsquery('english', ${searchQuery})
        ${categoryFilter}
        ${authorFilter}
        ${organizationFilter}
        ${keywordFilter}
        ${dateFilter}
        ${excludeFilter}
        ${citationFilter}
        ${minScoreFilter}
      ${orderByClause}
      LIMIT ${limit}
      OFFSET ${skip}
    `;

    const countResult = await prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(*) as total
      FROM "Article"
      WHERE status = 'PUBLISHED'
        AND "isVisible" = true
        AND to_tsvector('english', 
          coalesce(title, '') || ' ' || 
          coalesce(abstract, '') || ' ' || 
          coalesce(keywords, '') || ' ' ||
          coalesce(category, '') || ' ' ||
          coalesce("authorName", '') || ' ' ||
          coalesce("citationNumber", '')
        ) @@ plainto_tsquery('english', ${searchQuery})
        ${categoryFilter}
        ${authorFilter}
        ${organizationFilter}
        ${keywordFilter}
        ${dateFilter}
        ${excludeFilter}
        ${citationFilter}
        ${minScoreFilter}
    `;

    const total = Number(countResult[0]?.total || 0);

    return {
      results: searchResults,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      query: searchQuery,
      filters: {
        category: filters.category,
        author: filters.author,
        organization: filters.organization,
        keyword: filters.keyword,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        sortBy,
        sortOrder,
        minScore,
        exclude: filters.exclude,
        citation: filters.citation,
      },
    };
  }
}

export const articleSearchService = new ArticleSearchService();
