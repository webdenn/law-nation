import bcrypt from "bcrypt";
import type { CreateUserData } from "./types/create-user-data.type.js";
import { prisma } from "@/db/db.js";
import type { AuthUser } from "@/types/auth-request.js";
import { NotFoundError, BadRequestError } from "@/utils/http-errors.util.js";
import { VerificationService } from "@/utils/verification.utils.js";
import { sendEditorInvitationEmail } from "@/utils/email.utils.js";

const SALT = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

export const UserService = {
  createUser,
  listUsers,
  findUserById,
  inviteEditor,
};

export default UserService;

/**
 * Create a new user with one or more roles.
 */
async function createUser(data: CreateUserData, currentUser?: AuthUser) {
  const { name, email, password, roleIds } = data;

  if (!roleIds || roleIds.length === 0) {
    throw new BadRequestError("At least one roleId is required");
  }

  const passwordHash = await bcrypt.hash(password, SALT);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      roles: {
        create: roleIds.map((roleId) => ({
          role: { connect: { id: roleId } },
        })),
      },
    },
    include: {
      roles: { include: { role: true } },
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map((r) => r.role),
    },
  };
}

/**
 * List users with their roles.
 */
async function listUsers(currentUser?: AuthUser) {
  const users = await prisma.user.findMany({
    include: {
      roles: { include: { role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      roles: u.roles.map((r) => r.role),
    })),
  };
}

/**
 * Find a user by ID (with roles).
 */
async function findUserById(id: string, currentUser?: AuthUser) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: { include: { role: true } },
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map((r) => r.role),
    },
  };
}

/**
 * Invite an editor - sends invitation email with password setup link
 */
async function inviteEditor(data: { name: string; email: string }, currentUser?: AuthUser) {
  const { name, email } = data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new BadRequestError("User with this email already exists");
  }

  // Check if there's already a pending invitation
  const existingInvitation = await prisma.emailVerification.findFirst({
    where: {
      email,
      resourceType: "EDITOR_INVITE",
      isVerified: false,
    },
  });

  if (existingInvitation && new Date() < existingInvitation.ttl) {
    throw new BadRequestError("An invitation has already been sent to this email. Please wait for it to expire or ask the editor to check their inbox.");
  }

  // Get editor role
  const editorRole = await prisma.role.findUnique({
    where: { name: "editor" },
  });

  if (!editorRole) {
    throw new NotFoundError("Editor role not found. Please run database seed.");
  }

  // Create verification record with 48-hour TTL
  const { token, expiresAt } = await VerificationService.createVerificationRecord(
    email,
    "EDITOR_INVITE",
    {
      name,
      email,
      roleId: editorRole.id,
    },
    48 // 48 hours
  );

  // Send invitation email
  await sendEditorInvitationEmail(email, name, token);

  return {
    success: true,
    message: `Invitation sent to ${email}. The editor has 48 hours to set up their password.`,
    expiresAt,
  };
}
