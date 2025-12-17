import crypto from "crypto";
import { add } from "date-fns";
import { prisma } from "@/db/db.js";
import jwt, { type SignOptions, type Secret } from "jsonwebtoken";

// /src/utils/jwt.utils.ts

// Environment variables (type-safe defaults)
const JWT_SECRET = (process.env.JWT_SECRET as Secret) ?? "dev_secret";
const ACCESS_TOKEN_EXPIRY =
  (process.env.ACCESS_TOKEN_EXPIRY as
    | "15m"
    | "30m"
    | "1h"
    | "1d"
    | undefined) ?? "15m";

const REFRESH_TOKEN_EXPIRY_DAYS = parseInt(
  process.env.REFRESH_TOKEN_EXPIRY?.replace("d", "") || "30",
  10
);
const REFRESH_TOKEN_BYTES = 48;

/**
 * Creates a signed JWT access token for a given user ID.
 */
export function signAccessToken(userId: string): string {
  const payload = { sub: userId };
  const options: SignOptions = { expiresIn: ACCESS_TOKEN_EXPIRY };
  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verifies and decodes a JWT access token.
 */
export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as {
    sub: string;
    iat: number;
    exp: number;
  };
}

/**
 * Creates a refresh token for a user and stores its hashed version in the DB.
 */
export async function createRefreshTokenForUser(userId: string) {
  const raw = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = add(new Date(), { days: REFRESH_TOKEN_EXPIRY_DAYS });

  await prisma.refreshToken.create({
    data: { tokenHash, userId, expiresAt },
  });

  return raw; // raw token (to send to client)
}

/**
 * Revokes all refresh tokens matching a given raw token.
 */
export async function revokeRefreshToken(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revoked: true },
  });
}

/**
 * Consumes a refresh token (verifies and revokes it).
 * Returns the associated user ID if valid, otherwise null.
 */
export async function consumeRefreshToken(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const db = await prisma.refreshToken.findFirst({
    where: { tokenHash, revoked: false },
  });

  if (!db) return null;
  if (db.expiresAt < new Date()) return null;

  // revoke it to prevent reuse
  await prisma.refreshToken.update({
    where: { id: db.id },
    data: { revoked: true },
  });

  return db.userId;
}
