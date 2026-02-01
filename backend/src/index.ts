// src/index.ts
import "dotenv/config";
import express from "express";  // 👈 Add this
import path from "path";        // 👈 Add this
import app from "@/modules/app/app.js";
import { startCleanupCron } from "@/jobs/cleanup.cron.js";

const PORT = process.env.PORT ?? 4000;

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.listen(PORT, () => {
  console.log(`✅ Server listening on ${PORT} `);

  // Start cleanup cron job
  startCleanupCron();
});