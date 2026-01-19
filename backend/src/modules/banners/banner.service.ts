import { prisma } from "@/db/db.js";

export class BannerService {
  async createBanner(title: string | undefined, imageUrl: string) {
    return await prisma.banner.create({
      data: {
        title: title ?? null,
        imageUrl,
      },
    });
  }

  async getAllBanners() {
    // Sort by createdAt desc
    return await prisma.banner.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteBanner(id: string) {
    return await prisma.banner.delete({
      where: { id },
    });
  }
}
