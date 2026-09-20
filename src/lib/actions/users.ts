"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { recordAudit } from "@/lib/actions/audit";

const STAFF_ROLES = ["ADMIN", "HR", "PAYROLL", "MANAGER"];

const createSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(72),
  role: z.enum(["ADMIN", "HR", "PAYROLL", "MANAGER", "EMPLOYEE"]),
  employeeId: z.string().optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["SET_ROLE", "TOGGLE_ACTIVE", "RESET_PASSWORD"]),
  role: z.enum(["ADMIN", "HR", "PAYROLL", "MANAGER", "EMPLOYEE"]).optional(),
  password: z.string().min(8).max(72).optional(),
});

async function generateEmployeeNumber(): Promise<string> {
  const last = await db.employee.findFirst({
    where: { employeeNumber: { startsWith: "ADM" } },
    orderBy: { employeeNumber: "desc" },
    select: { employeeNumber: true },
  });
  if (!last) return "ADM0001";
  const num = parseInt(last.employeeNumber.replace("ADM", ""), 10) + 1;
  return `ADM${String(num).padStart(4, "0")}`;
}

async function resolveEmployeeEmail(firstName: string, lastName: string): Promise<string> {
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z0-9.]/g, "");
  const email = `${base}@company.com`;
  const exists = await db.user.findUnique({ where: { email } });
  if (!exists) return email;
  for (let i = 2; i < 100; i++) {
    const variant = `${base}${i}@company.com`;
    const vExists = await db.user.findUnique({ where: { email: variant } });
    if (!vExists) return variant;
  }
  return `${base}${Date.now()}@company.com`;
}

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

    const isStaff = STAFF_ROLES.includes(data.role);

    if (isStaff) {
      if (!data.firstName || !data.lastName) {
        return { error: "First name and last name are required for staff accounts." };
      }

      let employeeId = data.employeeId;

      if (!employeeId) {
        const emp = await db.employee.create({
          data: {
            employeeNumber: await generateEmployeeNumber(),
            firstName: data.firstName,
            lastName: data.lastName,
            hireDate: new Date(),
            employmentType: "REGULAR",
            basicSalary: 0,
            dailyRate: 0,
          },
        });
        employeeId = emp.id;
      }

      const staffUser = await db.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash: await bcrypt.hash(data.password, 12),
          role: data.role,
          isActive: true,
          employeeId,
        },
      });

      const pairedEmail = await resolveEmployeeEmail(data.firstName, data.lastName);
      const pairedUser = await db.user.create({
        data: {
          email: pairedEmail,
          passwordHash: await bcrypt.hash(data.password, 12),
          role: "EMPLOYEE",
          isActive: true,
          employeeId,
        },
      });

      await recordAudit({ action: "CREATE_USER", entity: "User", entityId: staffUser.id });
      return { ok: true };
    }

    const user = await db.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: await bcrypt.hash(data.password, 12),
        role: data.role,
        isActive: true,
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

