import { prisma } from "@/db/db.js";
import type {
  AuditEvent,
  AuditEventType,
  UserProfile,
  ArticleInfo,
  EditorInfo,
  DecisionOutcome,
  AuditTimeline,
  UserHistory,
  EditorActivity,
  AdminDecisions
} from "../types/audit.type.js";
import { InternalServerError } from "@/utils/http-errors.util.js";

export class AuditService {

  /**
   * Record user article upload
   */
  async recordUserUpload(userProfile: UserProfile, articleInfo: ArticleInfo): Promise<void> {
    try {
      const now = new Date();
      const eventDate = now.toISOString().split('T')[0] || now.getFullYear() + '-01-01';
      const eventTime = now.toTimeString().split(' ')[0] || '00:00:00';

      await prisma.auditEvent.create({
        data: {
          eventType: 'USER_UPLOAD',
          eventDate,
          eventTime,
          eventYear: now.getFullYear(),
          userId: userProfile.id,
          userName: userProfile.name || 'Unknown User',
          userEmail: userProfile.email || 'N/A',
          userOrganization: userProfile.organization || 'Law-Nation',
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category || 'General',
          articleAuthor: articleInfo.author || 'Unknown'
        }
      });

      console.log(`📝 [Audit] Recorded user upload: ${userProfile.name} uploaded "${articleInfo.title}"`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record user upload:`, error);
    }
  }

  /**
   * Record admin editor assignment
   */
  async recordEditorAssignment(
    adminProfile: UserProfile,
    articleInfo: ArticleInfo,
    editorInfo: EditorInfo
  ): Promise<void> {
    try {
      const now = new Date();
      const eventDate = now.toISOString().split('T')[0] || now.getFullYear() + '-01-01';
      const eventTime = now.toTimeString().split(' ')[0] || '00:00:00';

      await prisma.auditEvent.create({
        data: {
          eventType: 'EDITOR_ASSIGN',
          eventDate,
          eventTime,
          eventYear: now.getFullYear(),
          userId: adminProfile.id,
          userName: adminProfile.name || 'Unknown Admin',
          userEmail: adminProfile.email || 'N/A',
          userOrganization: adminProfile.organization || 'Law-Nation',
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category || 'General',
          articleAuthor: articleInfo.author || 'Unknown',
          targetEditorId: editorInfo.id,
          targetEditorName: editorInfo.name || 'Unknown Editor'
        }
      });

      console.log(`👨‍💼 [Audit] Recorded assignment: ${adminProfile.name} assigned "${articleInfo.title}" to ${editorInfo.name}`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record editor assignment:`, error);
    }
  }

  /**
   * Record admin editor reassignment
   */
  async recordEditorReassignment(
    adminProfile: UserProfile,
    articleInfo: ArticleInfo,
    previousEditor: EditorInfo,
    newEditor: EditorInfo
  ): Promise<void> {
    try {
      const now = new Date();
      const eventDate = now.toISOString().split('T')[0] || now.getFullYear() + '-01-01';
      const eventTime = now.toTimeString().split(' ')[0] || '00:00:00';

      await prisma.auditEvent.create({
        data: {
          eventType: 'EDITOR_REASSIGN',
          eventDate,
          eventTime,
          eventYear: now.getFullYear(),
          userId: adminProfile.id,
          userName: adminProfile.name || 'Unknown Admin',
          userEmail: adminProfile.email || 'N/A',
          userOrganization: adminProfile.organization || 'Law-Nation',
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category || 'General',
          articleAuthor: articleInfo.author || 'Unknown',
          previousEditorId: previousEditor.id,
          previousEditorName: previousEditor.name || 'Unknown Editor',
          targetEditorId: newEditor.id,
          targetEditorName: newEditor.name || 'Unknown Editor'
        }
      });

      console.log(`🔄 [Audit] Recorded reassignment: ${adminProfile.name} reassigned "${articleInfo.title}" from ${previousEditor.name} to ${newEditor.name}`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record editor reassignment:`, error);
    }
  }

  /**
   * Record editor document download
   */
  async recordEditorDownload(editorProfile: UserProfile, articleInfo: ArticleInfo): Promise<void> {
    try {
      const now = new Date();
      const eventDate = now.toISOString().split('T')[0] || now.getFullYear() + '-01-01';
      const eventTime = now.toTimeString().split(' ')[0] || '00:00:00';

      await prisma.auditEvent.create({
        data: {
          eventType: 'EDITOR_DOWNLOAD',
          eventDate,
          eventTime,
          eventYear: now.getFullYear(),
          userId: editorProfile.id,
          userName: editorProfile.name || 'Unknown Editor',
          userEmail: editorProfile.email || 'N/A',
          userOrganization: editorProfile.organization || 'Law-Nation',
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category || 'General',
          articleAuthor: articleInfo.author || 'Unknown'
        }
      });

      console.log(`📥 [Audit] Recorded download: ${editorProfile.name} downloaded "${articleInfo.title}"`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record editor download:`, error);
    }
  }

  /**
   * Record editor document upload with editing duration
   */
  async recordEditorUpload(
    editorProfile: UserProfile,
    articleInfo: ArticleInfo,
    editingDuration: string
  ): Promise<void> {
    try {
      const now = new Date();
      const eventDate = now.toISOString().split('T')[0] || now.getFullYear() + '-01-01';
      const eventTime = now.toTimeString().split(' ')[0] || '00:00:00';

      await prisma.auditEvent.create({
        data: {
          eventType: 'EDITOR_UPLOAD',
          eventDate,
          eventTime,
          eventYear: now.getFullYear(),
          userId: editorProfile.id,
          userName: editorProfile.name || 'Unknown Editor',
          userEmail: editorProfile.email || 'N/A',
          userOrganization: editorProfile.organization || 'Law-Nation',
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category || 'General',
          articleAuthor: articleInfo.author || 'Unknown',
          editingDuration: editingDuration
        }
      });

      console.log(`📤 [Audit] Recorded upload: ${editorProfile.name} uploaded "${articleInfo.title}" (Duration: ${editingDuration})`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record editor upload:`, error);
    }
  }

  /**
   * Record final admin decision
   */
  async recordFinalDecision(
    adminProfile: UserProfile,
    articleInfo: ArticleInfo,
    outcome: DecisionOutcome
  ): Promise<void> {
    try {
      const now = new Date();
      const eventDate = now.toISOString().split('T')[0] || now.getFullYear() + '-01-01';
      const eventTime = now.toTimeString().split(' ')[0] || '00:00:00';

      await prisma.auditEvent.create({
        data: {
          eventType: 'FINAL_DECISION',
          eventDate,
          eventTime,
          eventYear: now.getFullYear(),
          userId: adminProfile.id,
          userName: adminProfile.name || 'Unknown Admin',
          userEmail: adminProfile.email || 'N/A',
          userOrganization: adminProfile.organization || 'Law-Nation',
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category || 'General',
          articleAuthor: articleInfo.author || 'Unknown',
          decisionOutcome: outcome
        }
      });

      const icon = outcome === 'PUBLISHED' ? '✅' : '❌';
      console.log(`${icon} [Audit] Recorded decision: ${adminProfile.name} ${outcome.toLowerCase()} "${articleInfo.title}"`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record final decision:`, error);
    }
  }

  /**
   * NEW: Record reviewer assignment
   */
  async recordReviewerAssignment(
    adminProfile: UserProfile,
    articleInfo: ArticleInfo,
    reviewerInfo: EditorInfo
  ): Promise<void> {
    try {
      const now = new Date();
      const eventDate = now.toISOString().split('T')[0] || now.getFullYear() + '-01-01';
      const eventTime = now.toTimeString().split(' ')[0] || '00:00:00';

      await prisma.auditEvent.create({
        data: {
          eventType: 'REVIEWER_ASSIGN',
          eventDate,
          eventTime,
          eventYear: now.getFullYear(),
          userId: adminProfile.id,
          userName: adminProfile.name || 'Unknown Admin',
          userEmail: adminProfile.email || 'N/A',
          userOrganization: adminProfile.organization || 'Law-Nation',
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category || 'General',
          articleAuthor: articleInfo.author || 'Unknown',
          targetEditorId: reviewerInfo.id,
          targetEditorName: reviewerInfo.name || 'Unknown Reviewer'
        }
      });

      console.log(`👨‍🔬 [Audit] Recorded reviewer assignment: ${adminProfile.name} assigned "${articleInfo.title}" to reviewer ${reviewerInfo.name}`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record reviewer assignment:`, error);
    }
  }

  /**
   * NEW: Record reviewer reassignment
   */
  async recordReviewerReassignment(
    adminProfile: UserProfile,
    articleInfo: ArticleInfo,
    previousReviewer: EditorInfo,
    newReviewer: EditorInfo
  ): Promise<void> {
    try {
      const now = new Date();
      const eventDate = now.toISOString().split('T')[0] || now.getFullYear() + '-01-01';
      const eventTime = now.toTimeString().split(' ')[0] || '00:00:00';

      await prisma.auditEvent.create({
        data: {
          eventType: 'REVIEWER_REASSIGN',
          eventDate,
          eventTime,
          eventYear: now.getFullYear(),
          userId: adminProfile.id,
          userName: adminProfile.name || 'Unknown Admin',
          userEmail: adminProfile.email || 'N/A',
          userOrganization: adminProfile.organization || 'Law-Nation',
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category || 'General',
          articleAuthor: articleInfo.author || 'Unknown',
          targetEditorId: newReviewer.id,
          targetEditorName: newReviewer.name || 'Unknown Reviewer',
          previousEditorId: previousReviewer.id,
          previousEditorName: previousReviewer.name || 'Unknown Previous Reviewer'
        }
      });

      console.log(`🔄 [Audit] Recorded reviewer reassignment: ${adminProfile.name} reassigned "${articleInfo.title}" from ${previousReviewer.name} to ${newReviewer.name}`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record reviewer reassignment:`, error);
    }
  }

  /**
   * NEW: Record reviewer document download
   */
  async recordReviewerDownload(reviewerProfile: UserProfile, articleInfo: ArticleInfo): Promise<void> {
    try {
      const now = new Date();
      const eventDate = now.toISOString().split('T')[0] || now.getFullYear() + '-01-01';
      const eventTime = now.toTimeString().split(' ')[0] || '00:00:00';

      await prisma.auditEvent.create({
        data: {
          eventType: 'REVIEWER_DOWNLOAD',
          eventDate,
          eventTime,
          eventYear: now.getFullYear(),
          userId: reviewerProfile.id,
          userName: reviewerProfile.name || 'Unknown Reviewer',
          userEmail: reviewerProfile.email || 'N/A',
          userOrganization: reviewerProfile.organization || 'Law-Nation',
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category || 'General',
          articleAuthor: articleInfo.author || 'Unknown'
        }
      });

      console.log(`📥 [Audit] Recorded reviewer download: ${reviewerProfile.name} downloaded "${articleInfo.title}"`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record reviewer download:`, error);
    }
  }

  /**
   * NEW: Record reviewer document upload with editing duration
   */
  async recordReviewerUpload(
    reviewerProfile: UserProfile,
    articleInfo: ArticleInfo,
    editingDuration: { days: number; hours: number; minutes: number }
  ): Promise<void> {
    try {
      const now = new Date();
      const eventDate = now.toISOString().split('T')[0] || now.getFullYear() + '-01-01';
      const eventTime = now.toTimeString().split(' ')[0] || '00:00:00';

      await prisma.auditEvent.create({
        data: {
          eventType: 'REVIEWER_UPLOAD',
          eventDate,
          eventTime,
          eventYear: now.getFullYear(),
          userId: reviewerProfile.id,
          userName: reviewerProfile.name || 'Unknown Reviewer',
          userEmail: reviewerProfile.email || 'N/A',
          userOrganization: reviewerProfile.organization || 'Law-Nation',
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category || 'General',
          articleAuthor: articleInfo.author || 'Unknown',
          editingDurationDays: editingDuration.days,
          editingDurationHours: editingDuration.hours,
          editingDurationMinutes: editingDuration.minutes
        }
      });

      console.log(`📤 [Audit] Recorded reviewer upload: ${reviewerProfile.name} uploaded corrections for "${articleInfo.title}" (${editingDuration.days}d ${editingDuration.hours}h ${editingDuration.minutes}m)`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record reviewer upload:`, error);
    }
  }

  /**
   * NEW: Record admin override action
   */
  async recordAdminOverride(
    adminProfile: UserProfile,
    articleInfo: ArticleInfo,
    overrideType: 'DIRECT_PUBLISH' | 'BYPASS_EDITOR' | 'BYPASS_REVIEWER',
    reason: string
  ): Promise<void> {
    try {
      const now = new Date();
      const eventDate = now.toISOString().split('T')[0] || now.getFullYear() + '-01-01';
      const eventTime = now.toTimeString().split(' ')[0] || '00:00:00';

      await prisma.auditEvent.create({
        data: {
          eventType: 'ADMIN_OVERRIDE',
          eventDate,
          eventTime,
          eventYear: now.getFullYear(),
          userId: adminProfile.id,
          userName: adminProfile.name || 'Unknown Admin',
          userEmail: adminProfile.email || 'N/A',
          userOrganization: adminProfile.organization || 'Law-Nation',
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category || 'General',
          articleAuthor: articleInfo.author || 'Unknown',
          decisionOutcome: 'PUBLISHED',
          overrideReason: reason,
          overrideType: overrideType
        }
      });

      console.log(`🔒 [Audit] Recorded admin override: ${adminProfile.name} performed ${overrideType} for "${articleInfo.title}" - Reason: ${reason}`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record admin override:`, error);
    }
  }

  /**
   * Get complete timeline for an article
   */
  async getArticleTimeline(articleId: string): Promise<AuditTimeline> {
    try {
      console.log(`📋 [Audit] Fetching timeline for article: ${articleId}`);

      const events = await prisma.auditEvent.findMany({
        where: { articleId },
        orderBy: [
          { eventDate: 'asc' },
          { eventTime: 'asc' }
        ]
      });

      if (events.length === 0) {
        throw new Error('No audit events found for this article');
      }

      const firstEvent = events[0];
      if (!firstEvent) {
        throw new Error('Invalid audit events data');
      }

      const timeline: AuditTimeline = {
        articleId,
        articleTitle: firstEvent.articleTitle,
        events: events.map(event => ({
          eventType: event.eventType as AuditEventType,
          eventDate: event.eventDate,
          eventTime: event.eventTime,
          eventYear: event.eventYear,
          userName: event.userName,
          targetEditorName: event.targetEditorName || undefined,
          previousEditorName: event.previousEditorName || undefined,
          decisionOutcome: (event.decisionOutcome as DecisionOutcome) || undefined,
          editingDuration: event.editingDuration || undefined
        }))
      };

      console.log(`✅ [Audit] Retrieved ${events.length} events for article timeline`);
      return timeline;

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to get article timeline:`, error);
      throw new InternalServerError('Failed to retrieve article timeline');
    }
  }

  /**
   * Get user's submission history
   */
  async getUserHistory(userId: string): Promise<UserHistory> {
    try {
      console.log(`📋 [Audit] Fetching history for user: ${userId}`);

      const uploadEvents = await prisma.auditEvent.findMany({
        where: {
          userId,
          eventType: 'USER_UPLOAD'
        },
        orderBy: [
          { eventDate: 'desc' },
          { eventTime: 'desc' }
        ]
      });

      if (uploadEvents.length === 0) {
        throw new Error('No upload history found for this user');
      }

      const firstUpload = uploadEvents[0];
      if (!firstUpload) {
        throw new Error('Invalid upload events data');
      }

      const userHistory: UserHistory = {
        userId,
        userName: firstUpload.userName,
        submissions: []
      };

      // For each upload, find the final decision
      for (const upload of uploadEvents) {
        const finalDecision = await prisma.auditEvent.findFirst({
          where: {
            articleId: upload.articleId,
            eventType: 'FINAL_DECISION'
          }
        });

        userHistory.submissions.push({
          articleId: upload.articleId,
          articleTitle: upload.articleTitle,
          uploadDate: upload.eventDate,
          uploadTime: upload.eventTime,
          uploadYear: upload.eventYear,
          finalOutcome: (finalDecision?.decisionOutcome as DecisionOutcome) || undefined,
          decisionDate: finalDecision?.eventDate || undefined,
          decisionTime: finalDecision?.eventTime || undefined,
          decisionYear: finalDecision?.eventYear || undefined
        });
      }

      console.log(`✅ [Audit] Retrieved ${userHistory.submissions.length} submissions for user`);
      return userHistory;

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to get user history:`, error);
      throw new InternalServerError('Failed to retrieve user history');
    }
  }

  /**
   * Get editor's activity history
   */
  async getEditorActivity(editorId: string): Promise<EditorActivity> {
    try {
      console.log(`📋 [Audit] Fetching activity for editor: ${editorId}`);

      const editorEvents = await prisma.auditEvent.findMany({
        where: {
          userId: editorId,
          eventType: {
            in: ['EDITOR_DOWNLOAD', 'EDITOR_UPLOAD']
          }
        },
        orderBy: [
          { articleId: 'asc' },
          { eventDate: 'asc' },
          { eventTime: 'asc' }
        ]
      });

      if (editorEvents.length === 0) {
        throw new Error('No activity found for this editor');
      }

      const firstEvent = editorEvents[0];
      if (!firstEvent) {
        throw new Error('Invalid editor events data');
      }

      const editorActivity: EditorActivity = {
        editorId,
        editorName: firstEvent.userName,
        activities: []
      };

      // Group events by article
      const articleGroups = new Map<string, any[]>();
      editorEvents.forEach(event => {
        if (!articleGroups.has(event.articleId)) {
          articleGroups.set(event.articleId, []);
        }
        articleGroups.get(event.articleId)!.push(event);
      });

      // Process each article's events
      articleGroups.forEach((events, articleId) => {
        const downloadEvent = events.find(e => e.eventType === 'EDITOR_DOWNLOAD');
        const uploadEvent = events.find(e => e.eventType === 'EDITOR_UPLOAD');

        editorActivity.activities.push({
          articleId,
          articleTitle: events[0].articleTitle,
          downloadDate: downloadEvent?.eventDate,
          downloadTime: downloadEvent?.eventTime,
          downloadYear: downloadEvent?.eventYear,
          uploadDate: uploadEvent?.eventDate,
          uploadTime: uploadEvent?.eventTime,
          uploadYear: uploadEvent?.eventYear,
          editingDuration: uploadEvent?.editingDuration
        });
      });

      console.log(`✅ [Audit] Retrieved ${editorActivity.activities.length} activities for editor`);
      return editorActivity;

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to get editor activity:`, error);
      throw new InternalServerError('Failed to retrieve editor activity');
    }
  }

  /**
   * Get reviewer's activity history
   */
  async getReviewerActivity(reviewerId: string): Promise<EditorActivity> {
    try {
      console.log(`📋 [Audit] Fetching activity for reviewer: ${reviewerId}`);

      const reviewerEvents = await prisma.auditEvent.findMany({
        where: {
          userId: reviewerId,
          eventType: {
            in: ['REVIEWER_DOWNLOAD', 'REVIEWER_UPLOAD']
          }
        },
        orderBy: [
          { articleId: 'asc' },
          { eventDate: 'asc' },
          { eventTime: 'asc' }
        ]
      });

      if (reviewerEvents.length === 0) {
        throw new Error('No activity found for this reviewer');
      }

      const firstEvent = reviewerEvents[0];
      if (!firstEvent) {
        throw new Error('Invalid reviewer events data');
      }

      const reviewerActivity: EditorActivity = {
        editorId: reviewerId, // Reusing EditorActivity interface for reviewers
        editorName: firstEvent.userName,
        activities: []
      };

      // Group events by article
      const articleGroups = new Map<string, any[]>();
      reviewerEvents.forEach(event => {
        if (!articleGroups.has(event.articleId)) {
          articleGroups.set(event.articleId, []);
        }
        articleGroups.get(event.articleId)!.push(event);
      });

      // Process each article's events
      articleGroups.forEach((events, articleId) => {
        const downloadEvent = events.find(e => e.eventType === 'REVIEWER_DOWNLOAD');
        const uploadEvent = events.find(e => e.eventType === 'REVIEWER_UPLOAD');

        // Format editing duration from reviewer upload event
        let editingDuration: string | undefined;
        if (uploadEvent && uploadEvent.editingDurationDays !== null) {
          const days = uploadEvent.editingDurationDays || 0;
          const hours = uploadEvent.editingDurationHours || 0;
          const minutes = uploadEvent.editingDurationMinutes || 0;
          
          const parts = [];
          if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
          if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
          if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
          
          editingDuration = parts.length > 0 ? parts.join(', ') : '0 minutes';
        }

        reviewerActivity.activities.push({
          articleId,
          articleTitle: events[0].articleTitle,
          downloadDate: downloadEvent?.eventDate,
          downloadTime: downloadEvent?.eventTime,
          downloadYear: downloadEvent?.eventYear,
          uploadDate: uploadEvent?.eventDate,
          uploadTime: uploadEvent?.eventTime,
          uploadYear: uploadEvent?.eventYear,
          editingDuration
        });
      });

      console.log(`✅ [Audit] Retrieved ${reviewerActivity.activities.length} activities for reviewer`);
      return reviewerActivity;

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to get reviewer activity:`, error);
      throw new InternalServerError('Failed to retrieve reviewer activity');
    }
  }

  /**
   * Get admin's decision history
   */
  async getAdminDecisions(adminId: string): Promise<AdminDecisions> {
    try {
      console.log(`📋 [Audit] Fetching decisions for admin: ${adminId}`);

      const adminEvents = await prisma.auditEvent.findMany({
        where: {
          userId: adminId,
          eventType: {
            in: ['EDITOR_ASSIGN', 'EDITOR_REASSIGN', 'FINAL_DECISION']
          }
        },
        orderBy: [
          { articleId: 'asc' },
          { eventDate: 'asc' },
          { eventTime: 'asc' }
        ]
      });

      if (adminEvents.length === 0) {
        throw new Error('No decisions found for this admin');
      }

      const firstEvent = adminEvents[0];
      if (!firstEvent) {
        throw new Error('Invalid admin events data');
      }

      const adminDecisions: AdminDecisions = {
        adminId,
        adminName: firstEvent.userName,
        decisions: []
      };

      // Group events by article
      const articleGroups = new Map<string, any[]>();
      adminEvents.forEach(event => {
        if (!articleGroups.has(event.articleId)) {
          articleGroups.set(event.articleId, []);
        }
        articleGroups.get(event.articleId)!.push(event);
      });

      // Process each article's events
      articleGroups.forEach((events, articleId) => {
        const assignments = events
          .filter(e => e.eventType === 'EDITOR_ASSIGN' || e.eventType === 'EDITOR_REASSIGN')
          .map(event => ({
            type: event.eventType === 'EDITOR_ASSIGN' ? 'ASSIGN' as const : 'REASSIGN' as const,
            date: event.eventDate,
            time: event.eventTime,
            year: event.eventYear,
            editorName: event.targetEditorName,
            previousEditorName: event.previousEditorName || undefined
          }));

        const finalDecisionEvent = events.find(e => e.eventType === 'FINAL_DECISION');
        const finalDecision = finalDecisionEvent ? {
          outcome: finalDecisionEvent.decisionOutcome as DecisionOutcome,
          date: finalDecisionEvent.eventDate,
          time: finalDecisionEvent.eventTime,
          year: finalDecisionEvent.eventYear
        } : undefined;

        adminDecisions.decisions.push({
          articleId,
          articleTitle: events[0].articleTitle,
          assignments,
          finalDecision
        });
      });

      console.log(`✅ [Audit] Retrieved ${adminDecisions.decisions.length} decisions for admin`);
      return adminDecisions;

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to get admin decisions:`, error);
      throw new InternalServerError('Failed to retrieve admin decisions');
    }
  }

  /**
   * Get all audit events with filtering and pagination
   */
  async getAllAuditEvents(where: any, limit: number, offset: number): Promise<any[]> {
    try {
      console.log(`📋 [Audit] Fetching audit events with filters:`, where);

      const events = await prisma.auditEvent.findMany({
        where,
        orderBy: [
          { eventDate: 'desc' },
          { eventTime: 'desc' }
        ],
        take: limit,
        skip: offset
      });

      console.log(`✅ [Audit] Retrieved ${events.length} audit events`);
      return events;

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to get audit events:`, error);
      throw new InternalServerError('Failed to retrieve audit events');
    }
  }

  /**
   * Get total count of audit events for pagination
   */
  async getAuditEventsCount(where: any): Promise<number> {
    try {
      const count = await prisma.auditEvent.count({ where });
      console.log(`📊 [Audit] Total audit events count: ${count}`);
      return count;

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to get audit events count:`, error);
      throw new InternalServerError('Failed to get audit events count');
    }
  }
}