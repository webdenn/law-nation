import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import cookieParser from "cookie-parser";
import { nonExistingRoutesErrorHandler } from "@/error-handlers/non-existing-route.error-handler.js";
import { jwtErrorHandler } from "@/error-handlers/jwt.error-handler.js";
import { globalErrorHandler } from "@/error-handlers/global.error-handler.js";
import AppRouter from "./app.route.js";
// /src/app.ts
const app: express.Application = express();
app.disable("x-powered-by");
//  CORS Configuration
const allowedOrigins = [
  "https://lawnation.co.in",
  "https://www.lawnation.co.in",
  "http://localhost:3000",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(morgan("dev"));
// 5. Static Files with Cache Control
app.use(
  "/api/uploads",
  express.static(path.join(process.cwd(), "uploads"), {
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    },
  }),
);
// API routes mount point
app.use("/api", AppRouter);
// error-handlers
app.use(nonExistingRoutesErrorHandler);
app.use(jwtErrorHandler);
app.use(globalErrorHandler);
export default app;
