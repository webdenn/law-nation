# 🔧 Backend Implementation Guide: Editor Invitation System

This section details the specific changes required in the backend to support the **Admin Invite -> Editor Set Password** flow.

## 1. Database Schema Updates (`prisma/schema.prisma`)
We need to store the invitation token and its expiration date.
* **Update `User` Model:**
    * Add `invitationToken`: String? @unique
    * Add `invitationExpires`: DateTime?
    * *Goal:* To verify users when they click the email link.

## 2. Service Layer Updates (`src/modules/user/user.service.ts`)
New business logic is required to handle invitations.
* **Import Requirements:**
    * `crypto` (Node.js built-in) for token generation.
    * `sendEmail` utility for sending the invitation link.
* **Add Function: `inviteUser(data, currentUser)`**
    * Checks if email already exists.
    * Generates a random hex token.
    * Creates a user with `isActive: false` and a temporary random password.
    * Sends an email with the link: `http://localhost:3000/set-password/{token}`.
* **Add Function: `setupPassword(token, newPassword)`**
    * Finds user by `invitationToken`.
    * Validates if token is expired.
    * Hashes the new password.
    * Updates user: Sets `isActive: true`, clears `invitationToken`.

## 3. Controller Updates (`src/modules/user/user.controller.ts`)
New API handlers to receive requests from Frontend.
* **Add Handler: `inviteUserHandler`**
    * Validates body (`name`, `email`, `roleId`).
    * Calls `UserService.inviteUser`.
* **Add Handler: `setupPasswordHandler`**
    * Extracts `token` from URL params and `password` from body.
    * Calls `UserService.setupPassword`.

## 4. Route Updates (`src/modules/user/user.route.ts`)
Expose the new functionality via HTTP endpoints.
* **POST** `/invite` → Protected Route (Requires Admin Auth).
* **POST** `/setup-password/:token` → Public Route (No Auth required).

---