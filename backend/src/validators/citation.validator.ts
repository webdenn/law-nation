import { prisma } from "@/db/db.js";
import { BadRequestError } from "@/utils/http-errors.util.js";

/**
 * Citation Number Format: yyyyLN(XX)AYY
 * - yyyy: 4-digit year (e.g., 2026)
 * - LN: Fixed text (Law Nation)
 * - (XX): 1 or 2 digits only (e.g., 1, 01, 99)
 * - A: Fixed letter
 * - YY: Any number of digits (e.g., 34, 342, 1234)
 * 
 * Examples:
 * - 2026LN(1)A34 ✅
 * - 2026LN(01)A342 ✅
 * - 2026LN(99)A1234 ✅
 * 
 * NO SPACES ALLOWED
 */

const CITATION_REGEX = /^\d{4}LN\(\d{1,2}\)A\d+$/;

export class CitationValidator {
  /**
   * Validate citation number format
   */
  static validateFormat(citationNumber: string): void {
    if (!citationNumber || citationNumber.trim() === '') {
      throw new BadRequestError('Citation number is required');
    }

    const trimmedCitation = citationNumber.trim();

    if (!CITATION_REGEX.test(trimmedCitation)) {
      throw new BadRequestError(
        'Invalid citation format. Expected format: yyyyLN(XX)AYY (e.g., 2026LN(1)A34) - NO SPACES'
      );
    }
  }

  /**
   * Check if citation number is unique
   */
  static async validateUniqueness(citationNumber: string, excludeArticleId?: string): Promise<void> {
    const trimmedCitation = citationNumber.trim();

    const existingArticle = await prisma.article.findUnique({
      where: { citationNumber: trimmedCitation },
      select: { id: true, title: true }
    });

    if (existingArticle && existingArticle.id !== excludeArticleId) {
      throw new BadRequestError(
        `Citation number "${trimmedCitation}" is already used by article: ${existingArticle.title}`
      );
    }
  }

  /**
   * Validate both format and uniqueness
   */
  static async validate(citationNumber: string, excludeArticleId?: string): Promise<string> {
    const trimmedCitation = citationNumber.trim();
    
    // Validate format
    this.validateFormat(trimmedCitation);
    
    // Validate uniqueness
    await this.validateUniqueness(trimmedCitation, excludeArticleId);
    
    return trimmedCitation;
  }

  /**
   * Extract year from citation number
   */
  static extractYear(citationNumber: string): number | null {
    const match = citationNumber.match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Parse citation components
   */
  static parseCitation(citationNumber: string): {
    year: number;
    middleNumber: number;
    endNumber: number;
  } | null {
    const match = citationNumber.match(/^(\d{4})LN\((\d{1,2})\)A(\d+)$/);
    
    if (!match) return null;
    
    return {
      year: parseInt(match[1], 10),
      middleNumber: parseInt(match[2], 10),
      endNumber: parseInt(match[3], 10)
    };
  }
}
