"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, ForbiddenError } from "@/lib/auth";
import { recordAudit } from "@/lib/actions/audit";
import { resolveWorkDate } from "@/lib/time";

const manualLogSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum([
    "IN",
    "FIRST_BREAK_OUT",
    "FIRST_BREAK_IN",
    "LUNCH_OUT",
    "LUNCH_IN",
    "SECOND_BREAK_OUT",
    "SECOND_BREAK_IN",
    "OUT",
  ]),
  timestamp: z.string().min(1), // datetime-local
});

export async function addManualLogAction(_prev: { error?: string }, formData: FormData) {
  try {
    await requireRole("ADMIN", "HR", "PAYROLL");
  } catch {
    throw new ForbiddenError();
  }

  const parsed = manualLogSchema.safeParse({
    employeeId: String(formData.get("employeeId") ?? ""),
    type: String(formData.get("type") ?? ""),
    timestamp: String(formData.get("timestamp") ?? ""),
  });
  if (!parsed.success) return { error: "Please complete all fields." };

  const settings = await db.companySettings.findFirst();
  const ts = new Date(parsed.data.timestamp);
  if (Number.isNaN(ts.getTime())) return { error: "Invalid date/time." };

  const workDate = resolveWorkDate(ts, settings?.timezone ?? "Asia/Manila");

  await db.timeLog.create({
    data: {
      employeeId: parsed.data.employeeId,
      type: parsed.data.type,
      timestamp: ts,
      workDate,
      source: "MANUAL",
    },
  });

  await recordAudit({
    action: `MANUAL_${parsed.data.type}`,
    entity: "TimeLog",
    details: { employeeId: parsed.data.employeeId, at: ts.toISOString() },
  });

  revalidatePath("/attendance");
  return {};
}

const assignSchema = z.object({
  employeeIds: z.array(z.string()).min(1),
  shiftTemplateId: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  isRestDay: z.boolean().optional(),
  customStart: z.string().optional(),
  customEnd: z.string().optional(),
});

export async function assignScheduleAction(_prev: { error?: string; ok?: boolean }, formData: FormData) {
  try {
    await requireRole("ADMIN", "HR");
  } catch {
    throw new ForbiddenError();
  }

  const ids = formData.getAll("employeeIds").map(String).filter(Boolean);
  const parsed = assignSchema.safeParse({
    employeeIds: ids,
    shiftTemplateId: String(formData.get("shiftTemplateId") ?? "") || undefined,
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    isRestDay: formData.get("isRestDay") === "on",
    customStart: String(formData.get("customStart") ?? "") || undefined,
    customEnd: String(formData.get("customEnd") ?? "") || undefined,
  });
  if (!parsed.success) return { error: "Check assignment fields." };

  const start = new Date(parsed.data.startDate);
  const end = new Date(parsed.data.endDate);
  if (end < start) return { error: "End date must be after start date." };
  if (!parsed.data.shiftTemplateId && !parsed.data.isRestDay && !parsed.data.customStart) {
    return { error: "Pick a shift template, mark as rest day, or provide custom times." };
  }

  let created = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    for (const employeeId of parsed.data.employeeIds) {
      await db.shiftAssignment.upsert({
        where: { employeeId_date: { employeeId, date: day } },
        create: {
          employeeId,
          date: day,
          shiftTemplateId: parsed.data.shiftTemplateId ?? null,
          isRestDay: parsed.data.isRestDay ?? false,
          customStart: parsed.data.customStart ?? null,
          customEnd: parsed.data.customEnd ?? null,
        },
        update: {
          shiftTemplateId: parsed.data.shiftTemplateId ?? null,
          isRestDay: parsed.data.isRestDay ?? false,
          customStart: parsed.data.customStart ?? null,
          customEnd: parsed.data.customEnd ?? null,
        },
      });
      created++;
    }
  }

  await recordAudit({ action: "ASSIGN_SCHEDULE", entity: "ShiftAssignment", details: { ...parsed.data, count: created } });
  revalidatePath("/schedules");
  return { ok: true, count: created };
}
