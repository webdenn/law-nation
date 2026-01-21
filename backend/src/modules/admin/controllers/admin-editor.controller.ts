import type { Request, Response } from "express";
import { AdminEditorService } from "../services/admin-editor.service.js";
import type { CreateEditorData, UpdateEditorData } from "../types/admin-editor.type.js";

const adminEditorService = new AdminEditorService();

export class AdminEditorController {

  /**
   * GET /api/admin/editors
   * Get all editors
   */
  async getAllEditors(req: Request, res: Response): Promise<void> {
    try {
      console.log(`📋 [Admin Editor Controller] GET /api/admin/editors`);
      
      const editors = await adminEditorService.getAllEditors();
      
      res.status(200).json({
        success: true,
        data: editors,
        message: `Found ${editors.length} editors`
      });

    } catch (error: any) {
      console.error(`❌ [Admin Editor Controller] Failed to get editors:`, error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch editors'
      });
    }
  }

  /**
   * GET /api/admin/editors/:id
   * Get editor by ID
   */
  async getEditorById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Valid editor ID is required'
        });
        return;
      }
      
      console.log(`🔍 [Admin Editor Controller] GET /api/admin/editors/${id}`);
      
      const editor = await adminEditorService.getEditorById(id);
      
      res.status(200).json({
        success: true,
        data: editor,
        message: 'Editor found successfully'
      });

    } catch (error: any) {
      console.error(`❌ [Admin Editor Controller] Failed to get editor:`, error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch editor'
      });
    }
  }

  /**
   * POST /api/admin/editors
   * Create new editor
   */
  async createEditor(req: Request, res: Response): Promise<void> {
    try {
      console.log(`➕ [Admin Editor Controller] POST /api/admin/editors`);
      
      const editorData: CreateEditorData = {
        name: req.body.name,
        email: req.body.email,
        title: req.body.title,
        designation: req.body.designation,
        specialization: req.body.specialization || [],
        experience: req.body.experience,
        bio: req.body.bio
      };

      // Basic validation
      if (!editorData.name || !editorData.email) {
        res.status(400).json({
          success: false,
          message: 'Name and email are required'
        });
        return;
      }

      const editor = await adminEditorService.createEditor(editorData);
      
      res.status(201).json({
        success: true,
        data: editor,
        message: 'Editor created successfully'
      });

    } catch (error: any) {
      console.error(`❌ [Admin Editor Controller] Failed to create editor:`, error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to create editor'
      });
    }
  }

  /**
   * PUT /api/admin/editors/:id
   * Update editor
   */
  async updateEditor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Valid editor ID is required'
        });
        return;
      }
      
      console.log(`📝 [Admin Editor Controller] PUT /api/admin/editors/${id}`);
      
      const updateData: UpdateEditorData = {
        name: req.body.name,
        email: req.body.email,
        title: req.body.title,
        designation: req.body.designation,
        specialization: req.body.specialization,
        experience: req.body.experience,
        bio: req.body.bio,
        status: req.body.status
      };

      const editor = await adminEditorService.updateEditor(id, updateData);
      
      res.status(200).json({
        success: true,
        data: editor,
        message: 'Editor updated successfully'
      });

    } catch (error: any) {
      console.error(`❌ [Admin Editor Controller] Failed to update editor:`, error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to update editor'
      });
    }
  }

  /**
   * DELETE /api/admin/editors/:id
   * Delete editor (soft delete)
   */
  async deleteEditor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Valid editor ID is required'
        });
        return;
      }
      
      console.log(`🗑️ [Admin Editor Controller] DELETE /api/admin/editors/${id}`);
      
      await adminEditorService.deleteEditor(id);
      
      res.status(200).json({
        success: true,
        message: 'Editor deleted successfully'
      });

    } catch (error: any) {
      console.error(`❌ [Admin Editor Controller] Failed to delete editor:`, error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to delete editor'
      });
    }
  }

  /**
   * GET /api/admin/editors/:id/stats
   * Get editor statistics
   */
  async getEditorStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Valid editor ID is required'
        });
        return;
      }
      
      console.log(`📊 [Admin Editor Controller] GET /api/admin/editors/${id}/stats`);
      
      const stats = await adminEditorService.getEditorStats(id);
      
      res.status(200).json({
        success: true,
        data: stats,
        message: 'Editor statistics retrieved successfully'
      });

    } catch (error: any) {
      console.error(`❌ [Admin Editor Controller] Failed to get editor stats:`, error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch editor statistics'
      });
    }
  }

  /**
   * POST /api/admin/editors/:id/assign
   * Assign article to editor
   */
  async assignArticleToEditor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { articleId } = req.body;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Valid editor ID is required'
        });
        return;
      }
      
      console.log(`📝 [Admin Editor Controller] POST /api/admin/editors/${id}/assign`);
      
      if (!articleId) {
        res.status(400).json({
          success: false,
          message: 'Article ID is required'
        });
        return;
      }

      await adminEditorService.assignArticleToEditor(articleId, id);
      
      res.status(200).json({
        success: true,
        message: 'Article assigned to editor successfully'
      });

    } catch (error: any) {
      console.error(`❌ [Admin Editor Controller] Failed to assign article:`, error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to assign article to editor'
      });
    }
  }

  /**
   * GET /api/admin/editors/:id/workload
   * Get editor's current workload
   */
  async getEditorWorkload(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Valid editor ID is required'
        });
        return;
      }
      
      console.log(`📋 [Admin Editor Controller] GET /api/admin/editors/${id}/workload`);
      
      const workload = await adminEditorService.getEditorWorkload(id);
      
      res.status(200).json({
        success: true,
        data: workload,
        message: 'Editor workload retrieved successfully'
      });

    } catch (error: any) {
      console.error(`❌ [Admin Editor Controller] Failed to get editor workload:`, error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch editor workload'
      });
    }
  }
}