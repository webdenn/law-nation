import type { Request, Response } from "express";
import { SettingsService } from "./settings.service.js";
import type { AuthRequest } from "@/types/auth-request.js";

const settingsService = new SettingsService();

export const getAccessFooterSettings = async (req: Request, res: Response) => {
    try {
        const settings = await settingsService.getSettings("footer_content");
        res.json({ success: true, settings });
    } catch (error) {
        console.error("Get Footer Settings Error:", error);
        res.status(500).json({ error: "Failed to fetch footer settings" });
    }
};

export const updateFooterSettings = async (req: AuthRequest, res: Response) => {
    try {
        const { aboutText, researchersText } = req.body;

        // Validate authentication (should be handled by middleware, but good to be safe)
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const value = {
            aboutText: aboutText || "",
            researchersText: researchersText || "",
        };

        const updated = await settingsService.updateSettings("footer_content", value, req.user.id);
        res.json({ success: true, settings: updated.value });
    } catch (error) {
        console.error("Update Footer Settings Error:", error);
        res.status(500).json({ error: "Failed to update footer settings" });
    }
};

export const getOurPeopleSettings = async (req: Request, res: Response) => {
    try {
        const settings = await settingsService.getSettings("our_people_content");
        res.json({ success: true, settings });
    } catch (error) {
        console.error("Get Our People Settings Error:", error);
        res.status(500).json({ error: "Failed to fetch Our People settings" });
    }
};

export const updateOurPeopleSettings = async (req: AuthRequest, res: Response) => {
    try {
        const { teamMembers, editors, reviewers } = req.body;

        // Validate authentication
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const value = {
            teamMembers: Array.isArray(teamMembers) ? teamMembers : [],
            editors: Array.isArray(editors) ? editors : [],
            reviewers: Array.isArray(reviewers) ? reviewers : [],
        };

        const updated = await settingsService.updateSettings("our_people_content", value, req.user.id);
        res.json({ success: true, settings: updated.value });
    } catch (error) {
        console.error("Update Our People Settings Error:", error);
        res.status(500).json({ error: "Failed to update Our People settings" });
    }
};

export const uploadImage = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.fileUrl) {
            return res.status(400).json({ error: "No image file provided" });
        }
        res.json({ success: true, url: req.fileUrl });
    } catch (error) {
        console.error("Upload Image Error:", error);
        res.status(500).json({ error: "Failed to upload image" });
    }
};
