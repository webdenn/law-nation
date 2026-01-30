import { z } from 'zod';

/**
 * Validation schema for forgot password request
 */
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string({
        message: 'Email is required'
      })
      .email('Please enter a valid email address')
      .toLowerCase()
      .trim(),
  }),
});

/**
 * Validation schema for reset token validation
 */
export const validateResetTokenSchema = z.object({
  params: z.object({
    token: z
      .string({
        message: 'Reset token is required'
      })
      .min(1, 'Reset token cannot be empty')
      .uuid('Invalid reset token format'),
  }),
});

/**
 * Validation schema for password reset
 */
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z
      .string({
        message: 'Reset token is required'
      })
      .min(1, 'Reset token cannot be empty')
      .uuid('Invalid reset token format'),
    newPassword: z
      .string({
        message: 'New password is required'
      })
      .min(8, 'Password must be at least 8 characters long')
      .max(16, 'Password must be less than 16 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      ),
  }),
});

// Export types for TypeScript
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ValidateResetTokenRequest = z.infer<typeof validateResetTokenSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;