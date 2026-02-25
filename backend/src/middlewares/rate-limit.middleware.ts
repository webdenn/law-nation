import rateLimit from "express-rate-limit";
import type { AuthRequest } from "@/types/auth-request.js";
// Rate limiter for user PDF downloads
// Regular users: 20 downloads per hour
// Editors/Reviewers/Admins: No limit
export const userPdfDownloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 downloads per hour
  message: "Download limit reached (20 per hour). Please try again later.",
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,

  // Track by user ID instead of IP (more accurate for authenticated users)
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    return authReq.user?.id || req.ip || "unknown";
  },

  // Skip rate limiting for editors, reviewers, and admins
  skip: (req) => {
    const authReq = req as AuthRequest;
    const roles =
      authReq.user?.roles?.map((r: { name: string }) => r.name) || [];

    // Skip if user is editor, reviewer, or admin
    const isPrivilegedUser =
      roles.includes("editor") ||
      roles.includes("reviewer") ||
      roles.includes("admin");

    if (isPrivilegedUser) {
      console.log(
        ` [Rate Limit] Skipping for ${roles.join(", ")}: ${authReq.user?.name}`,
      );
    }

    return isPrivilegedUser;
  },

  // Custom handler when limit is exceeded
  handler: (req, res) => {
    const authReq = req as AuthRequest;
    console.log(
      `[Rate Limit] User ${authReq.user?.name} exceeded download limit`,
    );

    res.status(429).json({
      error: "Too many downloads",
      message:
        "You have reached the download limit of 20 per hour. Please try again later.",
      retryAfter: "1 hour",
    });
  },
});
