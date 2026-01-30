// Authentication helpers
// Handles password hashing and session cookies

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SALT_ROUNDS = 10;
const SESSION_COOKIE = "ridepool_session";

// ─────────────────────────────────────────────────────────────
// PASSWORD HELPERS
// ─────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─────────────────────────────────────────────────────────────
// SESSION HELPERS
// We use a simple approach: store the user ID in an HTTP-only cookie.
// For production, you'd want signed/encrypted cookies or JWT.
// ─────────────────────────────────────────────────────────────

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,       // JavaScript can't access this cookie (XSS protection)
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax",      // CSRF protection
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!userId) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        // Don't select passwordHash!
      },
    });
    return user;
  } catch {
    return null;
  }
}

// Type for the current user (without password)
export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
