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
          userName: userProfile.name,
          userEmail: userProfile.email,
          userOrganization: userProfile.organization,
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category,
          articleAuthor: articleInfo.author
        }
      });

      console.log(`📝 [Audit] Recorded user upload: ${userProfile.name} uploaded "${articleInfo.title}"`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record user upload:`, error);
      // Don't throw - audit failures shouldn't break main functionality
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
          userName: adminProfile.name,
          userEmail: adminProfile.email,
          userOrganization: adminProfile.organization,
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category,
          articleAuthor: articleInfo.author,
          targetEditorId: editorInfo.id,
          targetEditorName: editorInfo.name
        }
      });

      console.log(`👨‍💼 [Audit] Recorded assignment: ${adminProfile.name} assigned "${articleInfo.title}" to ${editorInfo.name}`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record editor assignment:`, error);
      // Don't throw - audit failures shouldn't break main functionality
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
          userName: adminProfile.name,
          userEmail: adminProfile.email,
          userOrganization: adminProfile.organization,
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category,
          articleAuthor: articleInfo.author,
          previousEditorId: previousEditor.id,
          previousEditorName: previousEditor.name,
          targetEditorId: newEditor.id,
          targetEditorName: newEditor.name
        }
      });

      console.log(`🔄 [Audit] Recorded reassignment: ${adminProfile.name} reassigned "${articleInfo.title}" from ${previousEditor.name} to ${newEditor.name}`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record editor reassignment:`, error);
      // Don't throw - audit failures shouldn't break main functionality
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
          userName: editorProfile.name,
          userEmail: editorProfile.email,
          userOrganization: editorProfile.organization,
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category,
          articleAuthor: articleInfo.author
        }
      });

      console.log(`📥 [Audit] Recorded download: ${editorProfile.name} downloaded "${articleInfo.title}"`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record editor download:`, error);
      // Don't throw - audit failures shouldn't break main functionality
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
          userName: editorProfile.name,
          userEmail: editorProfile.email,
          userOrganization: editorProfile.organization,
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category,
          articleAuthor: articleInfo.author,
          editingDuration: editingDuration
        }
      });

      console.log(`📤 [Audit] Recorded upload: ${editorProfile.name} uploaded "${articleInfo.title}" (Duration: ${editingDuration})`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record editor upload:`, error);
      // Don't throw - audit failures shouldn't break main functionality
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
          userName: adminProfile.name,
          userEmail: adminProfile.email,
          userOrganization: adminProfile.organization,
          articleId: articleInfo.id,
          articleTitle: articleInfo.title,
          articleCategory: articleInfo.category,
          articleAuthor: articleInfo.author,
          decisionOutcome: outcome
        }
      });

      const icon = outcome === 'PUBLISHED' ? '✅' : '❌';
      console.log(`${icon} [Audit] Recorded decision: ${adminProfile.name} ${outcome.toLowerCase()} "${articleInfo.title}"`);

    } catch (error: any) {
      console.error(`❌ [Audit] Failed to record final decision:`, error);
      // Don't throw - audit failures shouldn't break main functionality
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