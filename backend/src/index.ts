// src/index.ts
import "dotenv/config";
import app from "@/modules/app/app.js";
import { startCleanupCron } from "@/jobs/cleanup.cron.js";

const PORT = process.env.PORT ?? 4000;

app.listen(PORT, () => {
  console.log(`✅ Server listening on ${PORT}`);
  
  // Start cleanup cron job
  startCleanupCron();
});

