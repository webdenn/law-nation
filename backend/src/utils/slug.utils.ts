import slug from 'slug';
import { prisma } from '@/db/db.js';

/**
 * Generate a unique slug from article title
 * Handles duplicates by appending -2, -3, etc.
 * 
 * @param title - Article title
 * @param currentArticleId - Optional: ID of current article (for updates)
 * @returns Unique slug
 */
export async function generateUniqueSlug(
  title: string,
  currentArticleId?: string
): Promise<string> {
  // Generate base slug from title
  const baseSlug = slug(title, {
    lower: true,
    replacement: '-',
    trim: true,
  });

  // Start with base slug
  let finalSlug = baseSlug;
  let counter = 2;

  // Keep checking until we find a unique slug
  while (true) {
    // Check if slug exists (excluding current article if updating)
    const existingArticle = await prisma.article.findUnique({
      where: { slug: finalSlug },
      select: { id: true },
    });

    // If no existing article, or it's the current article being updated
    if (!existingArticle || existingArticle.id === currentArticleId) {
      return finalSlug;
    }

    // Slug exists, try with counter
    finalSlug = `${baseSlug}-${counter}`;
    counter++;
  }
}
