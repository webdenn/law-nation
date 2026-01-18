/**
 * Generate a unique slug from article title
 * Handles duplicates by appending -2, -3, etc.
 *
 * @param title - Article title
 * @param currentArticleId - Optional: ID of current article (for updates)
 * @returns Unique slug
 */
export declare function generateUniqueSlug(title: string, currentArticleId?: string): Promise<string>;
//# sourceMappingURL=slug.utils.d.ts.map