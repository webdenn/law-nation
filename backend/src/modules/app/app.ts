import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
// import helmet from 'helmet';
import cookieParser from "cookie-parser";
import { nonExistingRoutesErrorHandler } from "@/error-handlers/non-existing-route.error-handler.js";
import { jwtErrorHandler } from "@/error-handlers/jwt.error-handler.js";
import { globalErrorHandler } from "@/error-handlers/global.error-handler.js";
import AppRouter from "./app.route.js";

// /src/app.ts
const app: express.Application = express();

// app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(morgan("dev"));

// Serve static files from uploads folder
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// API routes mount point
app.use("/api", AppRouter);

//error-handlers
app.use(nonExistingRoutesErrorHandler);
app.use(jwtErrorHandler);
app.use(globalErrorHandler);

export default app;
