import express from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { uploadBannerImage } from "../../middlewares/upload.middleware.js";
import { getAccessFooterSettings, updateFooterSettings, getOurPeopleSettings, updateOurPeopleSettings, uploadImage } from "./settings.controller.js";

const router = express.Router();

// Public route to get footer
router.get("/footer", getAccessFooterSettings);

// Admin route to update footer (protected)
router.put("/footer", requireAuth, updateFooterSettings);

// Public route to get Our People
router.get("/our-people", getOurPeopleSettings);

// Admin route to update Our People (protected)
router.put("/our-people", requireAuth, updateOurPeopleSettings);

// Admin route to upload team member image (protected)
// We reuse uploadBannerImage middleware since it handles generic image uploads
router.post("/upload-image", requireAuth, uploadBannerImage, uploadImage);

export default router;
