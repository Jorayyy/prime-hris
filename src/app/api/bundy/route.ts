import { NextRequest, NextResponse } from "next/server";
import type { TimeLogType } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyBundyPin } from "@/lib/auth";
import { resolveWorkDate } from "@/lib/time";
import { PUNCH_LABELS, PUNCH_TYPES, computeBreakMinutes, expectedNextPunch, validatePunch } from "@/lib/punch";

/**
 * Simple in-memory throttle: max 5 failed attempts per minute per IP+employee.
 * Successful punches reset the counter.
 * For multi-instance deployments move this to Redis.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();

function throttled(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  return !!entry && entry.resetAt >= now && entry.count >= 5;
}

function registerFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 60_000 });
  } else {
    entry.count++;
  }
}

function clearFailures(key: string) {
  attempts.delete(key);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  let body: { employeeNumber?: string; pin?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const employeeNumber = String(body.employeeNumber ?? "").trim().toUpperCase();
  const pin = String(body.pin ?? "").trim();

  if (!employeeNumber || !/^\d{4,8}$/.test(pin)) {
    return NextResponse.json({ ok: false, error: "Employee number and 4-8 digit PIN required." }, { status: 400 });
  }

  if (throttled(`${ip}:${employeeNumber}`)) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Wait a minute and try again." },
      { status: 429 },
    );
  }

  const employee = await db.employee.findUnique({
    where: { employeeNumber },
    include: { user: true },
  });

  const invalid = () =>
    NextResponse.json({ ok: false, error: "Invalid employee number or PIN." }, { status: 401 });

  if (
    !employee ||
    employee.status !== "ACTIVE" ||
    !employee.bundyPinHash ||
    !(await verifyBundyPin(pin, employee.bundyPinHash))
  ) {
    registerFailure(`${ip}:${employeeNumber}`);
    await db.auditLog.create({
      data: {
        action: "BUNDY_FAIL",
        entity: "Employee",
        entityId: employee?.id ?? null,
        details: { employeeNumber },
        ip,
      },
    }).catch(() => {});
    return invalid();
  }

  const settings = await db.companySettings.findFirst();
  const timezone = settings?.timezone ?? "Asia/Manila";
  const now = new Date();
  const workDate = resolveWorkDate(now, timezone);

  // Determine punch type from existing logs this workDate
  const todayLogs = await db.timeLog.findMany({
    where: { employeeId: employee.id, workDate },
    orderBy: { timestamp: "asc" },
  });

  // Determine punch type: client's explicit choice (validated) or auto-detect
  clearFailures(`${ip}:${employeeNumber}`);
  const requestedType = typeof body.type === "string" ? body.type.toUpperCase() : undefined;

  let type: TimeLogType;
  if (requestedType) {
    if (!PUNCH_TYPES.includes(requestedType as TimeLogType)) {
      return NextResponse.json({ ok: false, error: "Unknown punch type." }, { status: 400 });
    }
    const verdict = validatePunch(requestedType as TimeLogType, todayLogs);
    if (!verdict.ok) {
      return NextResponse.json({ ok: false, error: verdict.error }, { status: 409 });
    }
    type = requestedType as TimeLogType;
  } else {
    type = expectedNextPunch(todayLogs);
  }

  await db.timeLog.create({
    data: {
      employeeId: employee.id,
      type,
      timestamp: now,
      workDate,
      source: "WEB",
      ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
    },
  });

  await updateAttendanceSummary(employee.id, workDate, timezone, settings?.graceMinutes ?? 5);

  return NextResponse.json({
    ok: true,
    type,
    nextType: expectedNextPunch([...todayLogs, { type, timestamp: now }]),
    timestamp: now.toISOString(),
    name: `${employee.firstName} ${employee.lastName}`,
    message:
      type === "IN"
        ? `Good day, ${employee.firstName}! Clock-in recorded.`
        : type === "OUT"
          ? `Take care, ${employee.firstName}! Clock-out recorded.`
          : `${PUNCH_LABELS[type]} recorded. Enjoy your break, ${employee.firstName}!`,
  });
}

/** Recompute the AttendanceDaily row for an employee/workDate from raw logs. */
async function updateAttendanceSummary(employeeId: string, workDate: Date, timezone: string, graceMinutes: number) {
  const logs = await db.timeLog.findMany({
    where: { employeeId, workDate },
    orderBy: { timestamp: "asc" },
  });

  const assignment = await db.shiftAssignment.findUnique({
    where: { employeeId_date: { employeeId, date: workDate } },
    include: { shiftTemplate: true },
  });

  const clockIns = logs.filter((l) => l.type === "IN");
  const clockOuts = logs.filter((l) => l.type === "OUT");

  const actualIn = clockIns[0]?.timestamp ?? null;
  const actualOut = clockOuts[clockOuts.length - 1]?.timestamp ?? null;

  const scheduledStart = assignment?.shiftTemplate?.startTime ?? assignment?.customStart ?? null;
  const scheduledEnd = assignment?.shiftTemplate?.endTime ?? assignment?.customEnd ?? null;
  const shiftGrace = assignment?.shiftTemplate?.graceMinutes ?? graceMinutes;

  let lateMinutes = 0;
  if (scheduledStart && actualIn) {
    const [h, m] = scheduledStart.split(":").map(Number);
    const sched = new Date(actualIn.toLocaleString("en-US", { timeZone: timezone }));
    sched.setHours(h, m, 0, 0);
    lateMinutes = Math.max(0, Math.round((actualIn.getTime() - sched.getTime()) / 60000));
  }

  let workedMinutes = 0;
  let breakMinutes = 0;
  if (actualIn && actualOut && actualOut > actualIn) {
    const spanMinutes = Math.round((actualOut.getTime() - actualIn.getTime()) / 60000);
    breakMinutes = computeBreakMinutes(logs);
    workedMinutes = Math.max(0, spanMinutes - breakMinutes);
  }

  const isRestDay = assignment?.isRestDay ?? false;
  let status: "PRESENT" | "LATE" | "INCOMPLETE" | "REST_DAY";
  if (!actualIn) {
    status = isRestDay ? "REST_DAY" : "INCOMPLETE";
  } else if (!actualOut) {
    status = "INCOMPLETE"; // still on shift
  } else {
    status = lateMinutes > shiftGrace ? "LATE" : isRestDay ? "REST_DAY" : "PRESENT";
  }

  await db.attendanceDaily.upsert({
    where: { employeeId_workDate: { employeeId, workDate } },
    create: {
      employeeId,
      workDate,
      scheduledStart,
      scheduledEnd,
      actualIn,
      actualOut,
      lateMinutes,
      workedMinutes,
      breakMinutes,
      status,
    },
    update: {
      scheduledStart,
      scheduledEnd,
      actualIn,
      actualOut,
      lateMinutes,
      workedMinutes,
      breakMinutes,
      status,
    },
  });
}
