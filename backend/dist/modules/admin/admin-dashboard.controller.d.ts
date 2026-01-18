import type { Response, NextFunction } from "express";
import type { AuthRequest } from "@/types/auth-request.js";
declare class AdminDashboardController {
    /**
     * Get overall dashboard summary
     * GET /api/admin/dashboard/summary
     */
    getSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get time metrics for article processing
     * GET /api/admin/dashboard/time-metrics
     */
    getTimeMetrics(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get status distribution
     * GET /api/admin/dashboard/status-distribution
     */
    getStatusDistribution(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get articles timeline with pagination
     * GET /api/admin/dashboard/articles-timeline
     */
    getArticlesTimeline(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const adminDashboardController: AdminDashboardController;
export {};
//# sourceMappingURL=admin-dashboard.controller.d.ts.map