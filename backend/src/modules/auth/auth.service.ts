import bcrypt from "bcrypt";
import { prisma } from "@/db/db.js";
import {
  signAccessToken,
  createRefreshTokenForUser,
  consumeRefreshToken,
  revokeRefreshToken,
} from "@/utils/jwt.utils.js";
import type { Response } from "express";
import { NotFoundError, UnauthorizedError } from "@/utils/http-errors.util.js";

// /src/modules/auth/auth.service.ts
export const AuthService = {
  login,
  refresh,
  logout,
  getCurrentUser,
};

export default AuthService;

// === Auth Service Functions ===
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
