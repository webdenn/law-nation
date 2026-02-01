import type { Response, NextFunction } from "express";
import type { AuthRequest } from "@/types/auth-request.js";
import { adminDashboardService } from "./admin-dashboard.service.js";
import { timelineQuerySchema, metricsQuerySchema } from "./validators/admin-dashboard.validator.js";

class AdminDashboardController {
  
  /**
   * Get overall dashboard summary
   * GET /api/admin/dashboard/summary
   */
  async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const summary = await adminDashboardService.getSummary();
      
      res.json({ summary });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get time metrics for article processing
   * GET /api/admin/dashboard/time-metrics
   */
  async getTimeMetrics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validatedQuery = metricsQuerySchema.parse(req.query);
      
      const metrics = await adminDashboardService.getTimeMetrics(validatedQuery);
      
      res.json({ metrics });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get status distribution
   * GET /api/admin/dashboard/status-distribution
   */
  async getStatusDistribution(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const distribution = await adminDashboardService.getStatusDistribution();
      
      res.json({ distribution });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get articles timeline with pagination
   * GET /api/admin/dashboard/articles-timeline
   */
  async getArticlesTimeline(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validatedQuery = timelineQuerySchema.parse(req.query);
      
      const result = await adminDashboardService.getArticlesTimeline(validatedQuery);
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const adminDashboardController = new AdminDashboardController();
