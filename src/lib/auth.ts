import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

const SESSION_COOKIE = "hris_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, meta?: { ip?: string; userAgent?: string }) {
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({
    data: {
      tokenHash: hashToken(rawToken),
      userId,
      expiresAt,
      ip: meta?.ip,
      userAgent: meta?.userAgent?.slice(0, 255),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  employeeId: string | null;
  firstName: string | null;
  lastName: string | null;
  employeeNumber: string | null;
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: {
      user: {
        include: { employee: true },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    // Clean up expired session opportunistically
    if (session) await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (!session.user.isActive) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    isActive: session.user.isActive,
    employeeId: session.user.employee?.id ?? null,
    firstName: session.user.employee?.firstName ?? null,
    lastName: session.user.employee?.lastName ?? null,
    employeeNumber: session.user.employee?.employeeNumber ?? null,
  };
});

export async function destroySession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (rawToken) {
    await db.session
      .delete({ where: { tokenHash: hashToken(rawToken) } })
      .catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}

export const MANAGEMENT_ROLES: Role[] = ["ADMIN", "HR", "PAYROLL", "MANAGER"];
export const HR_ROLES: Role[] = ["ADMIN", "HR"];
export const PAYROLL_ROLES: Role[] = ["ADMIN", "PAYROLL"];

export async function canManage(...roles: Role[]) {
  const user = await getSessionUser();
  if (!user || !roles.includes(user.role)) return null;
  return user;
}

// ---- Bundy PIN helpers (kiosk clock-in) ----

export async function verifyBundyPin(pin: string, pinHash: string | null): Promise<boolean> {
  if (!pinHash) return false;
  const a = Buffer.from(createHash("sha256").update(pin).digest("hex"));
  const b = Buffer.from(pinHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function hashBundyPin(pin: string): Promise<string> {
  return createHash("sha256").update(pin).digest("hex");
}
