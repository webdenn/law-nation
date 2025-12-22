import bcrypt from "bcrypt";
import { prisma } from "@/db/db.js";
import {
  signAccessToken,
  createRefreshTokenForUser,
  consumeRefreshToken,
  revokeRefreshToken,
} from "@/utils/jwt.utils.js";
import type { Response } from "express";
import { NotFoundError, UnauthorizedError, BadRequestError } from "@/utils/http-errors.util.js";
import { sendOtpEmail } from "@/utils/email.utils.js";

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

async function login(email: string, password: string, res: Response) {
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
    throw new BadRequestError("Verification code expired. Please request a new one");
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
 * Setup password for invited editor
 * Verifies token, creates user with editor role, and sets password
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
    throw new BadRequestError("Invitation link expired. Please contact admin for a new invitation.");
  }

  // Check if this is an editor invitation
  if (verification.resourceType !== "EDITOR_INVITE") {
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

  // Create user with editor role
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
    message: "Password set successfully. You can now log in with your credentials.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map((r) => r.role.name),
    },
  };
}
