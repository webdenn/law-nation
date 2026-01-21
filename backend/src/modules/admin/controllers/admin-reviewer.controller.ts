import type { Request, Response } from "express";
import { AdminReviewerService } from "../services/admin-reviewer.service.js";
import type { CreateReviewerData, UpdateReviewerData } from "../types/admin-reviewer.type.js";

const adminReviewerService = new AdminReviewerService();

export class AdminReviewerController {

  /**
   * GET /api/admin/reviewers
   * Get all reviewers
   */
  async getAllReviewers(req: Request, res: Response): Promise<void> {
    try {
      console.log(`📋 [Admin Reviewer Controller] GET /api/admin/reviewers`);
      
      const reviewers = await adminReviewerService.getAllReviewers();
      
      res.status(200).json({
        success: true,
        data: reviewers,
        message: `Found ${reviewers.length} reviewers`
      });

    } catch (error: any) {
      console.error(`❌ [Admin Reviewer Controller] Failed to get reviewers:`, error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch reviewers'
      });
    }
  }

  /**
   * GET /api/admin/reviewers/:id
   * Get reviewer by ID
   */
  async getReviewerById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Valid reviewer ID is required'
        });
        return;
      }
      
      console.log(`🔍 [Admin Reviewer Controller] GET /api/admin/reviewers/${id}`);
      
      const reviewer = await adminReviewerService.getReviewerById(id);
      
      res.status(200).json({
        success: true,
        data: reviewer,
        message: 'Reviewer found successfully'
      });

    } catch (error: any) {
      console.error(`❌ [Admin Reviewer Controller] Failed to get reviewer:`, error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch reviewer'
      });
    }
  }

  /**
   * POST /api/admin/reviewers
   * Create new reviewer
   */
  async createReviewer(req: Request, res: Response): Promise<void> {
    try {
      console.log(`➕ [Admin Reviewer Controller] POST /api/admin/reviewers`);
      
      const reviewerData: CreateReviewerData = {
        name: req.body.name,
        email: req.body.email,
        expertise: req.body.expertise || [],
        qualification: req.body.qualification,
        experience: req.body.experience,
        bio: req.body.bio
      };

      // Basic validation
      if (!reviewerData.name || !reviewerData.email) {
        res.status(400).json({
          success: false,
          message: 'Name and email are required'
        });
        return;
      }

      const reviewer = await adminReviewerService.createReviewer(reviewerData);
      
      res.status(201).json({
        success: true,
        data: reviewer,
        message: 'Reviewer created successfully'
      });

    } catch (error: any) {
      console.error(`❌ [Admin Reviewer Controller] Failed to create reviewer:`, error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to create reviewer'
      });
    }
  }

  /**
   * PUT /api/admin/reviewers/:id
   * Update reviewer
   */
  async updateReviewer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Valid reviewer ID is required'
        });
        return;
      }
      
      console.log(`📝 [Admin Reviewer Controller] PUT /api/admin/reviewers/${id}`);
      
      const updateData: UpdateReviewerData = {
        name: req.body.name,
        email: req.body.email,
        expertise: req.body.expertise,
        qualification: req.body.qualification,
        experience: req.body.experience,
        bio: req.body.bio,
        status: req.body.status
      };

      const reviewer = await adminReviewerService.updateReviewer(id, updateData);
      
      res.status(200).json({
        success: true,
        data: reviewer,
        message: 'Reviewer updated successfully'
      });

    } catch (error: any) {
      console.error(`❌ [Admin Reviewer Controller] Failed to update reviewer:`, error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to update reviewer'
      });
    }
  }

  /**
   * DELETE /api/admin/reviewers/:id
   * Delete reviewer (soft delete)
   */
  async deleteReviewer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Valid reviewer ID is required'
        });
        return;
      }
      
      console.log(`🗑️ [Admin Reviewer Controller] DELETE /api/admin/reviewers/${id}`);
      
      await adminReviewerService.deleteReviewer(id);
      
      res.status(200).json({
        success: true,
        message: 'Reviewer deleted successfully'
      });

    } catch (error: any) {
      console.error(`❌ [Admin Reviewer Controller] Failed to delete reviewer:`, error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to delete reviewer'
      });
    }
  }

  /**
   * GET /api/admin/reviewers/:id/stats
   * Get reviewer statistics
   */
  async getReviewerStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Valid reviewer ID is required'
        });
        return;
      }
      
      console.log(`📊 [Admin Reviewer Controller] GET /api/admin/reviewers/${id}/stats`);
      
      const stats = await adminReviewerService.getReviewerStats(id);
      
      res.status(200).json({
        success: true,
        data: stats,
        message: 'Reviewer statistics retrieved successfully'
      });

    } catch (error: any) {
      console.error(`❌ [Admin Reviewer Controller] Failed to get reviewer stats:`, error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch reviewer statistics'
      });
    }
  }

  /**
   * POST /api/admin/reviewers/:id/assign
   * Assign article to reviewer
   */
  async assignArticleToReviewer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { articleId } = req.body;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Valid reviewer ID is required'
        });
        return;
      }
      
      console.log(`📝 [Admin Reviewer Controller] POST /api/admin/reviewers/${id}/assign`);
      
      if (!articleId) {
        res.status(400).json({
          success: false,
          message: 'Article ID is required'
        });
        return;
      }

      await adminReviewerService.assignArticleToReviewer(articleId, id);
      
      res.status(200).json({
        success: true,
        message: 'Article assigned to reviewer successfully'
      });

    } catch (error: any) {
      console.error(`❌ [Admin Reviewer Controller] Failed to assign article:`, error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to assign article to reviewer'
      });
    }
  }

  /**
   * GET /api/admin/reviewers/:id/workload
   * Get reviewer's current workload
   */
  async getReviewerWorkload(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Valid reviewer ID is required'
        });
        return;
      }
      
      console.log(`📋 [Admin Reviewer Controller] GET /api/admin/reviewers/${id}/workload`);
      
      const workload = await adminReviewerService.getReviewerWorkload(id);
      
      res.status(200).json({
        success: true,
        data: workload,
        message: 'Reviewer workload retrieved successfully'
      });

    } catch (error: any) {
      console.error(`❌ [Admin Reviewer Controller] Failed to get reviewer workload:`, error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch reviewer workload'
      });
    }
  }
}