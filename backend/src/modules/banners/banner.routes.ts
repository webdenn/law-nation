import express from "express";
import { uploadBannerImage } from "../../middlewares/upload.middleware.js";
import { uploadBanner, getBanners, deleteBanner } from "./banner.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", requireAuth, uploadBannerImage, uploadBanner);
router.get("/", getBanners);
router.delete("/:id", requireAuth, deleteBanner);

export default router;
