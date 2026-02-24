import type { Request, Response, NextFunction } from "express";
// /src/error-handlers/global.error-handler.ts
export function globalErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Always log full error details server-side for debugging
  console.error("Global Error:", {
    error: err,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  const isProduction = process.env.NODE_ENV === "production";

  // In production: send generic, safe responses
  if (isProduction) {
    // Only expose safe error messages, hide internal details
    const safeMessage = status === 500 ? "Internal server error" : message;

    res.status(status).json({
      success: false,
      message: safeMessage,
      // No details, no stack traces in production
    });
  } else {
    // In development: send full details for debugging
    res.status(status).json({
      success: false,
      message,
      details: err.details,
      stack: err.stack,
    });
  }
}
