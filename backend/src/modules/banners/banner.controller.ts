import type { Request, Response } from "express";
import { BannerService } from "./banner.service.js";

const bannerService = new BannerService();

export const uploadBanner = async (req: Request, res: Response) => {
    try {
        // Use fileUrl from middleware which handles path logic correctly
        const fileUrl = req.fileUrl;

        const title = req.body.title as string | undefined;

        if (!fileUrl) {
            return res.status(400).json({ error: "No image uploaded" });
        }

        const banner = await bannerService.createBanner(title, fileUrl);
        res.status(201).json({ success: true, banner });
    } catch (error) {
        console.error("Upload Banner Error:", error);
        res.status(500).json({ error: "Failed to upload banner" });
    }
};

export const getBanners = async (req: Request, res: Response) => {
    try {
        const banners = await bannerService.getAllBanners();
        res.json({ success: true, banners });
    } catch (error) {
        console.error("Get Banners Error:", error);
        res.status(500).json({ error: "Failed to fetch banners" });
    }
};

export const deleteBanner = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        if (!id) {
            return res.status(400).json({ error: "Banner ID is required" });
        }
        await bannerService.deleteBanner(id);
        res.json({ success: true, message: "Banner deleted successfully" });
    } catch (error) {
        console.error("Delete Banner Error:", error);
        res.status(500).json({ error: "Failed to delete banner" });
    }
};
