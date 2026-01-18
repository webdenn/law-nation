import { prisma } from "@/db/db.js";
import { NotFoundError } from "@/utils/http-errors.util.js";
//Article Media Service Handles thumbnails and images for articles
export class ArticleMediaService {
    //Upload thumbnail for existing article
    async uploadThumbnail(articleId, thumbnailUrl) {
        const article = await prisma.article.findUnique({
            where: { id: articleId },
        });
        if (!article) {
            throw new NotFoundError("Article not found");
        }
        const updatedArticle = await prisma.article.update({
            where: { id: articleId },
            data: { thumbnailUrl },
        });
        return updatedArticle;
    }
    //Upload multiple images for existing article
    async uploadImages(articleId, imageUrls) {
        const article = await prisma.article.findUnique({
            where: { id: articleId },
        });
        if (!article) {
            throw new NotFoundError("Article not found");
        }
        const updatedImageUrls = [...(article.imageUrls || []), ...imageUrls];
        const updatedArticle = await prisma.article.update({
            where: { id: articleId },
            data: { imageUrls: updatedImageUrls },
        });
        return updatedArticle;
    }
}
export const articleMediaService = new ArticleMediaService();
//# sourceMappingURL=article-media.service.js.map