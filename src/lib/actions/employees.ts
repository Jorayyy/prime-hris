"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, hashPassword, hashBundyPin, ForbiddenError } from "@/lib/auth";
import { recordAudit } from "@/lib/actions/audit";
import { dailyRateFromMonthly } from "@/lib/payroll/ph";
import type { Gender, CivilStatus, EmploymentType, EmployeeStatus } from "@prisma/client";

const employeeSchema = z.object({
  // Personal
  firstName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional().or(z.literal("")),
  lastName: z.string().min(1).max(100),
  suffix: z.string().max(10).optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "NON_BINARY", "PREFER_NOT_TO_SAY"]).optional().or(z.literal("")),
  civilStatus: z.enum(["SINGLE", "MARRIED", "WIDOWED", "SEPARATED", "ANNULLED"]).optional().or(z.literal("")),
  mobileNumber: z.string().max(30).optional().or(z.literal("")),
  personalEmail: z.string().email().optional().or(z.literal("")),
  presentAddress: z.string().max(500).optional().or(z.literal("")),

  // Emergency
  emergencyName: z.string().max(150).optional().or(z.literal("")),
  emergencyRelation: z.string().max(50).optional().or(z.literal("")),
  emergencyPhone: z.string().max(30).optional().or(z.literal("")),

  // Government IDs
  sssNumber: z.string().max(20).optional().or(z.literal("")),
  philhealthNumber: z.string().max(20).optional().or(z.literal("")),
  pagibigNumber: z.string().max(20).optional().or(z.literal("")),
  tinNumber: z.string().max(20).optional().or(z.literal("")),

  // Employment
  hireDate: z.string().min(1),
  employmentType: z.enum(["PROBITIONARY", "REGULAR", "CONTRACTUAL", "SEASONAL", "PART_TIME", "INTERN"]),
  basicSalary: z.coerce.number().min(0),
  siteId: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  campaignId: z.string().optional().or(z.literal("")),
  positionId: z.string().optional().or(z.literal("")),
  reportsToId: z.string().optional().or(z.literal("")),

  // Account
  workEmail: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "HR", "PAYROLL", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
  bundyPin: z.string().regex(/^\d{4,8}$/, "PIN must be 4-8 digits"),
});

export type EmployeeFormState = { error?: string; ok?: boolean };

function optionalDate(v: FormDataEntryValue | string | null | undefined): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function nextEmployeeNumber(): Promise<string> {
  const count = await db.employee.count();
  let candidate = `EMP${String(count + 1).padStart(4, "0")}`;
  while (await db.employee.findUnique({ where: { employeeNumber: candidate } })) {
    candidate = `EMP${String(Math.floor(Math.random() * 99999)).padStart(5, "0")}`;
  }
  return candidate;
}

export async function createEmployeeAction(_prev: EmployeeFormState, formData: FormData): Promise<EmployeeFormState> {
  try {
    await requireRole("ADMIN", "HR");
  } catch {
    throw new ForbiddenError();
  }

  const parsed = employeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form fields." };
  }
  const data = parsed.data;

  const existingUser = await db.user.findUnique({ where: { email: data.workEmail.toLowerCase() } });
  if (existingUser) return { error: "An account with this work email already exists." };

  const employeeNumber = await nextEmployeeNumber();

  const user = await db.user.create({
    data: {
      email: data.workEmail.toLowerCase(),
      passwordHash: await hashPassword(data.password),
      role: data.role,
    },
  });

  const monthlyRate = data.basicSalary;

  const employee = await db.employee.create({
    data: {
      employeeNumber,
      userId: user.id,
      firstName: data.firstName,
      middleName: data.middleName || null,
      lastName: data.lastName,
      suffix: data.suffix || null,
      dateOfBirth: optionalDate(data.dateOfBirth),
      gender: data.gender || null,
      civilStatus: data.civilStatus || null,
      mobileNumber: data.mobileNumber || null,
      personalEmail: data.personalEmail || null,
      presentAddress: data.presentAddress || null,
      emergencyName: data.emergencyName || null,
      emergencyRelation: data.emergencyRelation || null,
      emergencyPhone: data.emergencyPhone || null,
      sssNumber: data.sssNumber || null,
      philhealthNumber: data.philhealthNumber || null,
      pagibigNumber: data.pagibigNumber || null,
      tinNumber: data.tinNumber || null,
      hireDate: new Date(data.hireDate),
      employmentType: data.employmentType,
      basicSalary: monthlyRate,
      dailyRate: dailyRateFromMonthly(monthlyRate),
      siteId: data.siteId || null,
      departmentId: data.departmentId || null,
      campaignId: data.campaignId || null,
      positionId: data.positionId || null,
      reportsToId: data.reportsToId || null,
      bundyPinHash: await hashBundyPin(data.bundyPin),
      bundyPinSetAt: new Date(),
    },
  });

  await db.salaryHistoryEntry.create({
    data: {
      employeeId: employee.id,
      previous: 0,
      newRate: monthlyRate,
      reason: "Initial hiring rate",
      effectiveAt: new Date(data.hireDate),
    },
  });

  await recordAudit({
    action: "CREATE_EMPLOYEE",
    entity: "Employee",
    entityId: employee.id,
    details: { employeeNumber, name: `${data.firstName} ${data.lastName}` },
  });

  redirect(`/employees/${employee.id}`);
}

const updateSchema = employeeSchema.partial().extend({ id: z.string() });

export async function updateEmployeeAction(_prev: EmployeeFormState, formData: FormData): Promise<EmployeeFormState> {
  try {
    await requireRole("ADMIN", "HR");
  } catch {
    throw new ForbiddenError();
  }

  const raw = Object.fromEntries(formData);
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form fields." };
  }
  const { id, ...rest } = parsed.data;
  void rest;

  // Rebuild payload from formData directly for simplicity & partial updates
  const str = (k: string) => {
    const v = String(raw[k] ?? "").trim();
    return v === "" ? null : v;
  };

  const current = await db.employee.findUnique({ where: { id } });
  if (!current) return { error: "Employee not found." };

  const newMonthly = raw.basicSalary !== undefined && String(raw.basicSalary) !== "" ? Number(raw.basicSalary) : Number(current.basicSalary);
  const salaryChanged = newMonthly !== Number(current.basicSalary);

  const updated = await db.employee.update({
    where: { id },
    data: {
      firstName: str("firstName") ?? current.firstName,
      middleName: str("middleName"),
      lastName: str("lastName") ?? current.lastName,
      suffix: str("suffix"),
      dateOfBirth: optionalDate(raw.dateOfBirth),
      gender: (str("gender") as Gender) ?? null,
      civilStatus: (str("civilStatus") as CivilStatus) ?? null,
      mobileNumber: str("mobileNumber"),
      personalEmail: str("personalEmail"),
      presentAddress: str("presentAddress"),
      emergencyName: str("emergencyName"),
      emergencyRelation: str("emergencyRelation"),
      emergencyPhone: str("emergencyPhone"),
      sssNumber: str("sssNumber"),
      philhealthNumber: str("philhealthNumber"),
      pagibigNumber: str("pagibigNumber"),
      tinNumber: str("tinNumber"),
      employmentType: (str("employmentType") as EmploymentType) ?? current.employmentType,
      status: (str("status") as EmployeeStatus) ?? current.status,
      regularizedDate: optionalDate(raw.regularizedDate),
      separationDate: optionalDate(raw.separationDate),
      separationReason: str("separationReason"),
      basicSalary: newMonthly,
      dailyRate: dailyRateFromMonthly(newMonthly),
      siteId: str("siteId"),
      departmentId: str("departmentId"),
      campaignId: str("campaignId"),
      positionId: str("positionId"),
      reportsToId: str("reportsToId"),
      bundyPinHash: str("bundyPin") ? await hashBundyPin(String(raw.bundyPin)) : undefined,
      bundyPinSetAt: str("bundyPin") ? new Date() : undefined,
    },
  });

  if (salaryChanged) {
    await db.salaryHistoryEntry.create({
      data: {
        employeeId: id,
        previous: current.basicSalary,
        newRate: newMonthly,
        reason: str("salaryChangeReason") ?? "Salary adjustment",
        effectiveAt: new Date(),
      },
    });
  }

  await recordAudit({
    action: salaryChanged ? "UPDATE_EMPLOYEE_SALARY" : "UPDATE_EMPLOYEE",
    entity: "Employee",
    entityId: id,
    details: { employeeNumber: updated.employeeNumber },
  });

  return { ok: true };
}
