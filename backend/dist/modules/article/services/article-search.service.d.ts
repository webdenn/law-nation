export declare class ArticleSearchService {
    searchArticles(searchQuery: string, filters: {
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
        page?: number;
        limit?: number;
    }): Promise<{
        results: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        query: string;
        filters: {
            category: string | undefined;
            author: string | undefined;
            organization: string | undefined;
            keyword: string | undefined;
            dateFrom: string | undefined;
            dateTo: string | undefined;
            sortBy: "date" | "title" | "relevance" | "author";
            sortOrder: "asc" | "desc";
            minScore: number;
            exclude: string | undefined;
        };
    }>;
}
export declare const articleSearchService: ArticleSearchService;
//# sourceMappingURL=article-search.service.d.ts.map