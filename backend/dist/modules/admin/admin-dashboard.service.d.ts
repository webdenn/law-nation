import type { TimelineQuery, MetricsQuery } from "./validators/admin-dashboard.validator.js";
import type { DashboardSummary, TimeMetrics, StatusDistribution, ArticlesTimelineResponse } from "./types/admin-dashboard.type.js";
declare class AdminDashboardService {
    /**
     * Get overall dashboard summary
     */
    getSummary(): Promise<DashboardSummary>;
    /**
     * Calculate time metrics for article processing
     */
    getTimeMetrics(query: MetricsQuery): Promise<TimeMetrics>;
    /**
     * Get status distribution
     */
    getStatusDistribution(): Promise<StatusDistribution>;
    /**
     * Get articles timeline with pagination
     */
    getArticlesTimeline(query: TimelineQuery): Promise<ArticlesTimelineResponse>;
    /**
     * Helper: Calculate days between two dates
     */
    private daysBetween;
    /**
     * Helper: Calculate average
     */
    private average;
    /**
     * Helper: Calculate median
     */
    private median;
    /**
     * Helper: Calculate all durations for an article
     */
    private calculateDurations;
}
export declare const adminDashboardService: AdminDashboardService;
export {};
//# sourceMappingURL=admin-dashboard.service.d.ts.map