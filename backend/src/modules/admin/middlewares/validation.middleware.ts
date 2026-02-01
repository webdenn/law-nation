import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

/**
 * Generic validation middleware for Zod schemas
 */
export const validateRequest = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate the request against the schema
      const validationResult = schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query
      });

      if (!validationResult.success) {
        // Extract validation errors
        const errors = validationResult.error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        console.warn(`⚠️ [Validation] Request validation failed:`, errors);

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors
        });
        return;
      }

      // If validation passes, continue to the next middleware
      next();

    } catch (error: any) {
      console.error(`❌ [Validation] Validation middleware error:`, error);
      res.status(500).json({
        success: false,
        message: 'Internal validation error'
      });
    }
  };
};