import express from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { getAccessFooterSettings, updateFooterSettings } from "./settings.controller.js";

const router = express.Router();

// Public route to get footer
router.get("/footer", getAccessFooterSettings);

// Admin route to update footer (protected)
router.put("/footer", requireAuth, updateFooterSettings);

export default router;
