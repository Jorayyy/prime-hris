"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, requireUser, ForbiddenError } from "@/lib/auth";
import { recordAudit } from "@/lib/actions/audit";

const fileSchema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().min(3).max(1000),
});

function businessDaysBetween(start: Date, end: Date): number {
  let days = 0;
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  while (d <= e) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) days++; // skip Sun/Sat; refine with rest-day schedules later
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export async function fileLeaveAction(_prev: { error?: string }, formData: FormData) {
  const user = await requireUser();
  if (!user.employeeId) return { error: "Your account is not linked to an employee record." };

  const parsed = fileSchema.safeParse({
    leaveTypeId: String(formData.get("leaveTypeId") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    reason: String(formData.get("reason") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the leave form." };
  }

  const start = new Date(parsed.data.startDate);
  const end = new Date(parsed.data.endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (end < start) return { error: "End date must be on or after the start date." };

  const days = businessDaysBetween(start, end);
  if (days <= 0) return { error: "Selected range contains no working days." };

  const year = start.getFullYear();

  // Balance check for quota'd types
  const balance = await db.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId: user.employeeId, leaveTypeId: parsed.data.leaveTypeId, year } },
  });

  const overlapping = await db.leaveRequest.count({
    where: {
      employeeId: user.employeeId,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });
  if (overlapping > 0) return { error: "You already have a request overlapping these dates." };

  await db.$transaction(async (tx) => {
    await tx.leaveRequest.create({
      data: {
        employeeId: user.employeeId!,
        leaveTypeId: parsed.data.leaveTypeId,
        startDate: start,
        endDate: end,
        days,
        reason: parsed.data.reason,
      },
    });

    if (balance) {
      await tx.leaveBalance.update({
        where: { id: balance.id },
        data: { pending: { increment: days } },
      });
    }
  });

  await recordAudit({ action: "FILE_LEAVE", entity: "LeaveRequest", details: { ...parsed.data, days } });
  revalidatePath("/leaves");
  return {};
}

const decideSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED", "CANCELLED"]),
  remarks: z.string().max(500).optional(),
});

export async function decideLeaveAction(_prev: { error?: string }, formData: FormData) {
  let user;
  try {
    user = await requireRole("ADMIN", "HR", "MANAGER");
  } catch {
    throw new ForbiddenError();
  }

  const parsed = decideSchema.safeParse({
    requestId: String(formData.get("requestId") ?? ""),
    decision: String(formData.get("decision") ?? ""),
    remarks: String(formData.get("remarks") ?? "") || undefined,
  });
  if (!parsed.success) return { error: "Invalid decision payload." };

  const request = await db.leaveRequest.findUnique({ where: { id: parsed.data.requestId } });
  if (!request || request.status !== "PENDING") return { error: "Request is not pending." };

  await db.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: request.id },
      data: {
        status: parsed.data.decision,
        approverId: user!.id,
        decidedAt: new Date(),
        remarks: parsed.data.remarks ?? null,
      },
    });

    const bal = await tx.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year: request.startDate.getFullYear(),
        },
      },
    });

    if (bal) {
      if (parsed.data.decision === "APPROVED") {
        await tx.leaveBalance.update({
          where: { id: bal.id },
          data: { pending: { decrement: request.days }, used: { increment: request.days } },
        });
      } else if (parsed.data.decision === "REJECTED" || parsed.data.decision === "CANCELLED") {
        await tx.leaveBalance.update({
          where: { id: bal.id },
          data: { pending: { decrement: request.days } },
        });
      }
    }

    if (parsed.data.decision === "APPROVED") {
      // Mark covered work dates as ON_LEAVE
      const dates: Array<{ employeeId: string; workDate: Date }> = [];
      for (let d = new Date(request.startDate); d <= request.endDate; d.setDate(d.getDate() + 1)) {
        dates.push({ employeeId: request.employeeId, workDate: new Date(d) });
      }
      for (const key of dates) {
        await tx.attendanceDaily.upsert({
          where: { employeeId_workDate: key },
          create: { ...key, status: "ON_LEAVE" },
          update: { status: "ON_LEAVE" },
        });
      }
    }
  });

  await recordAudit({
    action: `LEAVE_${parsed.data.decision}`,
    entity: "LeaveRequest",
    entityId: request.id,
  });

  revalidatePath("/leaves");
  return {};
}
