import bcrypt from "bcrypt";
import { prisma } from "@/db/db.js";
import {
  signAccessToken,
  createRefreshTokenForUser,
  consumeRefreshToken,
  revokeRefreshToken,
} from "@/utils/jwt.utils.js";
import type { Response } from "express";
import {
  NotFoundError,
  UnauthorizedError,
  BadRequestError,
} from "@/utils/http-errors.util.js";
import { sendOtpEmail, sendPasswordResetEmail } from "@/utils/email.utils.js";
import { randomUUID } from "crypto";

const SALT = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

// /src/modules/auth/auth.service.ts
export const AuthService = {
  signup,
  login,
  refresh,
  logout,
  getCurrentUser,
  sendVerificationOtp,
  verifyOtp,
  setupPassword,
  requestPasswordReset,
  validateResetToken,
  resetPassword,
};

export default AuthService;

//  Auth Service Functions
async function signup(data: {
  name: string;
  email: string;
  password: string;
  phone?: string | undefined;
}) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new BadRequestError("User with this email already exists");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, SALT);

  // Get default "user" role (create it if it doesn't exist)
  let defaultRole = await prisma.role.findUnique({
    where: { name: "user" },
  });

  // If default role doesn't exist, create it
  if (!defaultRole) {
    defaultRole = await prisma.role.create({
      data: {
        name: "user",
        description: "Default user role for registered users",
      },
    });
  }

  // Create user with default role
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      passwordHash,
      roles: {
        create: {
          roleId: defaultRole.id,
        },
      },
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  return {
    message: "User registered successfully.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

async function login(
  email: string,
  password: string,
  res: Response,
  requireAdminAccess: boolean = false
) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) throw new UnauthorizedError("invalid credentials");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new UnauthorizedError("invalid credentials");

  // Check if admin access is required (for admin/editor/reviewer login)
  if (requireAdminAccess) {
    const hasManagementAccess = user.roles.some(
      (r) => r.role.name === "admin" || r.role.name === "editor" || r.role.name === "reviewer"
    );

    if (!hasManagementAccess) {
      throw new UnauthorizedError(
        "Access denied. Admin, Editor, or Reviewer privileges required."
      );
    }
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = await createRefreshTokenForUser(user.id);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  });

  return {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map((r) => ({
        id: r.role.id,
        name: r.role.name,
      })),
    },
  };
}

async function refresh(refreshToken: string | undefined, res: Response) {
  if (!refreshToken) throw new Error("refresh token missing");

  const userId = await consumeRefreshToken(refreshToken);
  if (!userId) throw new UnauthorizedError("invalid or expired refresh token");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) throw new NotFoundError("user not found");

  const accessToken = signAccessToken(user.id);
  const newRefresh = await createRefreshTokenForUser(user.id);

  res.cookie("refreshToken", newRefresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });

  return {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map((r) => ({
        id: r.role.id,
        name: r.role.name,
      })),
    },
  };
}

async function logout(refreshToken: string | undefined, res: Response) {
  if (refreshToken) await revokeRefreshToken(refreshToken);
  res.clearCookie("refreshToken");
  return { ok: true };
}

async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) throw new NotFoundError("user not found");

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map((r) => ({
        id: r.role.id,
        name: r.role.name,
      })),
    },
  };
}

// OTP Email Verification Functions
async function sendVerificationOtp(email: string) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new BadRequestError("User with this email already exists");
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Set expiration to 10 minutes from now
  const ttl = new Date();
  ttl.setMinutes(ttl.getMinutes() + 10);

  // Delete any existing unverified OTP for this email
  await prisma.emailVerification.deleteMany({
    where: {
      email,
      resourceType: "USER_REGISTRATION",
      isVerified: false,
    },
  });

  // Create new verification record
  await prisma.emailVerification.create({
    data: {
      resourceId: email, // Using email as resourceId for user registration
      resourceType: "USER_REGISTRATION",
      email,
      token: otp,
      ttl,
      metadata: {},
    },
  });

  // Send OTP via email
  await sendOtpEmail(email, otp);

  return {
    success: true,
    message: "Verification code sent to your email",
  };
}

async function verifyOtp(email: string, otp: string) {
  // Find verification record
  const verification = await prisma.emailVerification.findFirst({
    where: {
      email,
      token: otp,
      resourceType: "USER_REGISTRATION",
    },
  });

  if (!verification) {
    throw new BadRequestError("Invalid verification code");
  }

  // Check if already verified
  if (verification.isVerified) {
    throw new BadRequestError("Verification code already used");
  }

  // Check if expired
  if (new Date() > verification.ttl) {
    throw new BadRequestError(
      "Verification code expired. Please request a new one"
    );
  }

  // Mark as verified
  await prisma.emailVerification.update({
    where: { id: verification.id },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  return {
    success: true,
    message: "Email verified successfully",
  };
}

/**
 * Setup password for invited editor or reviewer
 * Verifies token, creates user with appropriate role, and sets password
 */
async function setupPassword(token: string, password: string) {
  // Find verification record
  const verification = await prisma.emailVerification.findUnique({
    where: { token },
  });

  if (!verification) {
    throw new BadRequestError("Invalid invitation token");
  }

  // Check if already verified
  if (verification.isVerified) {
    throw new BadRequestError("This invitation has already been used");
  }

  // Check if expired
  if (new Date() > verification.ttl) {
    throw new BadRequestError(
      "Invitation link expired. Please contact admin for a new invitation."
    );
  }

  // Check if this is an editor or reviewer invitation
  if (verification.resourceType !== "EDITOR_INVITE" && verification.resourceType !== "REVIEWER_INVITE") {
    throw new BadRequestError("Invalid invitation type");
  }

  // Get metadata
  const metadata = verification.metadata as any;
  const { name, email, roleId } = metadata;

  if (!name || !email || !roleId) {
    throw new BadRequestError("Invalid invitation data");
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new BadRequestError("User with this email already exists");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT);

  // Create user with appropriate role (editor or reviewer)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      roles: {
        create: {
          roleId,
        },
      },
    },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  // Mark verification as complete
  await prisma.emailVerification.update({
    where: { id: verification.id },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  return {
    success: true,
    message:
      "Password set successfully. You can now log in with your credentials.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map((r) => r.role.name),
    },
  };
}

/**
 * Request password reset - sends reset email to user
 * Works for all user types: Admin, Editor, Reviewer, User
 */
async function requestPasswordReset(email: string) {
  try {
    // Find user by email (all user types)
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    // Always return success message (don't reveal if email exists)
    const successMessage = "If this email exists in our system, you will receive password reset instructions.";

    // If user doesn't exist, still return success (security best practice)
    if (!user) {
      console.log(`🔒 [Password Reset] Email not found: ${email}`);
      return {
        success: true,
        message: successMessage,
      };
    }

    // Check if user account is active
    if (!user.isActive) {
      console.log(`🔒 [Password Reset] Inactive account: ${email}`);
      return {
        success: true,
        message: successMessage,
      };
    }

    // Generate secure reset token
    const resetToken = randomUUID();

    // Set expiration to 30 minutes from now
    const ttl = new Date();
    ttl.setMinutes(ttl.getMinutes() + 30);

    // Delete any existing password reset tokens for this email
    await prisma.emailVerification.deleteMany({
      where: {
        email,
        resourceType: "PASSWORD_RESET",
        isVerified: false,
      },
    });

    // Create new password reset record
    await prisma.emailVerification.create({
      data: {
        resourceId: user.id,
        resourceType: "PASSWORD_RESET",
        email: user.email,
        token: resetToken,
        ttl,
        metadata: {
          userId: user.id,
          requestedAt: new Date().toISOString(),
        },
      },
    });

    // Send password reset email
    await sendPasswordResetEmail(user.email, user.name, resetToken);

    console.log(`✅ [Password Reset] Reset email sent to: ${email}`);

    return {
      success: true,
      message: successMessage,
    };

  } catch (error) {
    console.error(`❌ [Password Reset] Failed to process request:`, error);
    
    // Return generic success message even on error (don't reveal system issues)
    return {
      success: true,
      message: "If this email exists in our system, you will receive password reset instructions.",
    };
  }
}

/**
 * Validate password reset token
 * Checks if token is valid, not expired, and not already used
 */
async function validateResetToken(token: string) {
  try {
    // Find verification record
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
    });

    if (!verification) {
      throw new BadRequestError("Invalid or expired reset token");
    }

    // Check if this is a password reset token
    if (verification.resourceType !== "PASSWORD_RESET") {
      throw new BadRequestError("Invalid reset token type");
    }

    // Check if already used
    if (verification.isVerified) {
      throw new BadRequestError("This reset link has already been used");
    }

    // Check if expired
    if (new Date() > verification.ttl) {
      throw new BadRequestError("Reset link has expired. Please request a new one");
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: verification.resourceId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new BadRequestError("User account not found");
    }

    if (!user.isActive) {
      throw new BadRequestError("User account is inactive");
    }

    console.log(`✅ [Password Reset] Valid token for user: ${user.email}`);

    return {
      success: true,
      message: "Reset token is valid",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };

  } catch (error) {
    console.error(`❌ [Password Reset] Token validation failed:`, error);
    throw error;
  }
}

/**
 * Reset user password using valid token
 * Updates password and invalidates the token
 */
async function resetPassword(token: string, newPassword: string) {
  try {
    // Validate token first (this will throw if invalid)
    const tokenValidation = await validateResetToken(token);
    const userId = tokenValidation.user.id;

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT);

    // Update user password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Mark token as used
    await prisma.emailVerification.update({
      where: { token },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    // Revoke all existing refresh tokens for this user (force re-login everywhere)
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });

    console.log(`✅ [Password Reset] Password updated for user: ${tokenValidation.user.email}`);

    return {
      success: true,
      message: "Password reset successful. Please log in with your new password.",
      user: {
        id: tokenValidation.user.id,
        email: tokenValidation.user.email,
      },
    };

  } catch (error) {
    console.error(`❌ [Password Reset] Password reset failed:`, error);
    throw error;
  }
}
