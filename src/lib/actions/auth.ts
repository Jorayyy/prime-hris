"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { error: "Please enter a valid email and password." };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  // Uniform error to prevent user enumeration
  if (!user || !user.isActive) {
    return { error: "Invalid email or password." };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password." };
  }

  const h = await headers();
  await createSession(user.id, {
    ip: h.get("x-forwarded-for") ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
  });

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
