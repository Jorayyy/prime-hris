"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { recordAudit } from "@/lib/actions/audit";

const createSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(72),
  role: z.enum(["ADMIN", "HR", "PAYROLL", "MANAGER", "EMPLOYEE"]),
  employeeId: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["SET_ROLE", "TOGGLE_ACTIVE", "RESET_PASSWORD"]),
  role: z.enum(["ADMIN", "HR", "PAYROLL", "MANAGER", "EMPLOYEE"]).optional(),
  password: z.string().min(8).max(72).optional(),
});

export async function listUsers() {
  await requireRole("ADMIN");
  return db.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { employee: { select: { employeeNumber: true, firstName: true, lastName: true } } },
  });
}

export async function createUserAction(_prev: { error?: string; ok?: boolean }, formData: FormData) {
  try {
    await requireRole("ADMIN");
    const raw = Object.fromEntries(formData.entries());
    const data = createSchema.parse(raw);
    const exists = await db.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (exists) return { error: "A user with this email already exists." };
    const user = await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: await bcrypt.hash(data.password, 12),
        role: data.role,
        isActive: true,
        ...(data.employeeId ? { employeeId: data.employeeId } : {}),
      },
    });
    await recordAudit({ action: "CREATE_USER", entity: "User", entityId: user.id });
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create user." };
  }
}

export async function updateUserAction(_prev: { error?: string; ok?: boolean }, formData: FormData) {
  try {
    const actor = await requireRole("ADMIN");
    const raw = Object.fromEntries(formData.entries());
    const data = updateSchema.parse(raw);

    const target = await db.user.findUnique({ where: { id: data.id } });
    if (!target) return { error: "User not found." };
    if (target.role === "SUPER_ADMIN") {
      return { error: "The system owner account cannot be modified here." };
    }

    switch (data.action) {
      case "SET_ROLE": {
        if (!data.role) return { error: "Role required." };
        await db.user.update({ where: { id: target.id }, data: { role: data.role } });
        break;
      }
      case "TOGGLE_ACTIVE": {
        if (target.id === actor.id) return { error: "You cannot deactivate your own account." };
        await db.user.update({ where: { id: target.id }, data: { isActive: !target.isActive } });
        break;
      }
      case "RESET_PASSWORD": {
        if (!data.password) return { error: "New password required (min 8 characters)." };
        await db.user.update({
          where: { id: target.id },
          data: { passwordHash: await bcrypt.hash(data.password, 12), mustChangePassword: true },
        });
        break;
      }
    }
    await recordAudit({ action: `USER_${data.action}`, entity: "User", entityId: target.id });
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Update failed." };
  }
}

