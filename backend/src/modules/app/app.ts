// import express from "express";
// import cors from "cors";
// import morgan from "morgan";
// import path from "path";
// // import helmet from 'helmet';
// import cookieParser from "cookie-parser";
// import { nonExistingRoutesErrorHandler } from "@/error-handlers/non-existing-route.error-handler.js";
// import { jwtErrorHandler } from "@/error-handlers/jwt.error-handler.js";
// import { globalErrorHandler } from "@/error-handlers/global.error-handler.js";
// import AppRouter from "./app.route.js";

// // /src/app.ts
// const app: express.Application = express();
// app.use(cors({
//   origin: "http://localhost:3000", // Frontend URL specifically batayein (Best Practice)
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // ✅ PATCH allow kiya
//   allowedHeaders: ["Content-Type", "Authorization"] // ✅ Token aur JSON headers allow kiye
// }));

// // app.use(helmet());
// app.use(cors({ origin: true, credentials: true }));
// app.use(cookieParser());
// app.use(express.json());
// app.use(morgan("dev"));

// // Serve static files from uploads folder
// app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// // API routes mount point
// app.use("/api", AppRouter);

// //error-handlers
// app.use(nonExistingRoutesErrorHandler);
// app.use(jwtErrorHandler);
// app.use(globalErrorHandler);

// export default app;

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

app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), {
  setHeaders: (res) => {
    // Disable caching for all uploaded files to prevent PDF cross-contamination
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

// API routes mount point
app.use("/api", AppRouter);

//error-handlers
app.use(nonExistingRoutesErrorHandler);
app.use(jwtErrorHandler);
app.use(globalErrorHandler);

export default app;
