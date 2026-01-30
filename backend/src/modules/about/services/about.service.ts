import { PrismaClient } from '@prisma/client';
import type { AboutContentInput } from '../validators/about.validator.js';

const prisma = new PrismaClient();

export class AboutService {
  /**
   * Get current about us content
   */
  async getAboutContent(): Promise<{ id: string; content: string; updatedAt: string } | null> {
    try {
      const aboutUs = await prisma.aboutUs.findFirst({
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!aboutUs) {
        return null;
      }

      return {
        id: aboutUs.id,
        content: aboutUs.content,
        updatedAt: aboutUs.updatedAt.toISOString()
      };
    } catch (error) {
      console.error('❌ [AboutService] Failed to get about content:', error);
      throw new Error('Failed to retrieve about content');
    }
  }

  /**
   * Update about us content (creates new record if none exists)
   */
  async updateAboutContent(data: AboutContentInput): Promise<{ id: string; content: string; updatedAt: string }> {
    try {
      // Check if any record exists
      const existingRecord = await prisma.aboutUs.findFirst();

      let aboutUs;

      if (existingRecord) {
        // Update existing record
        aboutUs = await prisma.aboutUs.update({
          where: { id: existingRecord.id },
          data: {
            content: data.content,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new record
        aboutUs = await prisma.aboutUs.create({
          data: {
            content: data.content
          }
        });
      }

      return {
        id: aboutUs.id,
        content: aboutUs.content,
        updatedAt: aboutUs.updatedAt.toISOString()
      };
    } catch (error) {
      console.error('❌ [AboutService] Failed to update about content:', error);
      throw new Error('Failed to update about content');
    }
  }

  /**
   * Create default about content if none exists
   */
  async createDefaultContent(): Promise<{ id: string; content: string; updatedAt: string }> {
    try {
      const defaultContent = `
        <h2>About Law Nation</h2>
        <p>Welcome to Law Nation, your premier destination for legal insights, analysis, and expertise.</p>
        
        <h3>Our Mission</h3>
        <p>We are dedicated to providing comprehensive legal resources, expert analysis, and cutting-edge research to legal professionals, students, and anyone seeking to understand the complexities of law.</p>
        
        <h3>What We Offer</h3>
        <ul>
          <li>In-depth legal articles and analysis</li>
          <li>Expert commentary on current legal developments</li>
          <li>Research papers and case studies</li>
          <li>Educational resources for legal professionals</li>
        </ul>
        
        <h3>Our Commitment</h3>
        <p>At Law Nation, we believe in the power of knowledge and the importance of accessible legal information. Our team of experienced legal professionals and researchers work tirelessly to bring you the most relevant and accurate legal content.</p>
      `;

      const aboutUs = await prisma.aboutUs.create({
        data: {
          content: defaultContent.trim()
        }
      });

      return {
        id: aboutUs.id,
        content: aboutUs.content,
        updatedAt: aboutUs.updatedAt.toISOString()
      };
    } catch (error) {
      console.error('❌ [AboutService] Failed to create default content:', error);
      throw new Error('Failed to create default about content');
    }
  }

  /**
   * Check if about content exists
   */
  async contentExists(): Promise<boolean> {
    try {
      const count = await prisma.aboutUs.count();
      return count > 0;
    } catch (error) {
      console.error('❌ [AboutService] Failed to check content existence:', error);
      return false;
    }
  }

  /**
   * Get content for preview (same as get but for admin preview)
   */
  async previewContent(content: string): Promise<{ content: string; previewAt: string }> {
    // This is just for preview - doesn't save to database
    return {
      content: content,
      previewAt: new Date().toISOString()
    };
  }
}