"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { HR_ROLES } from "@/lib/auth";

export type HrInboxItem = {
  id: string;
  type: "leave" | "overtime" | "payroll_exception" | "attendance_exception";
  title: string;
  subtitle: string;
  employeeName: string;
  employeeId: string;
  status: string;
  date: Date;
  link: string;
};

export async function getHrInbox(): Promise<HrInboxItem[]> {
  await requireRole(...HR_ROLES);

  const [pendingLeaves, pendingOvertime, payrollExceptions, attendanceExceptions] =
    await Promise.all([
      db.leaveRequest.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: 20,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
          leaveType: { select: { name: true, code: true } },
        },
      }),
      db.overtimeRequest.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: 20,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        },
      }),
      db.payrollException.findMany({
        where: { resolved: false },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
          payPeriod: { select: { label: true } },
        },
      }),
      db.attendanceDaily.findMany({
        where: {
          status: { in: ["LATE", "INCOMPLETE", "ABSENT"] },
        },
        orderBy: { date: "desc" },
        take: 20,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
        },
      }),
    ]);

  const items: HrInboxItem[] = [];

  for (const leave of pendingLeaves) {
    const name = `${leave.employee.firstName ?? ""} ${leave.employee.lastName ?? ""}`.trim();
    items.push({
      id: leave.id,
      type: "leave",
      title: `${leave.leaveType.name} Request`,
      subtitle: `${Number(leave.days)} day(s) · ${leave.reason}`,
      employeeName: name,
      employeeId: leave.employee.id,
      status: leave.status,
      date: leave.createdAt,
      link: "/leaves",
    });
  }

  for (const ot of pendingOvertime) {
    const name = `${ot.employee.firstName ?? ""} ${ot.employee.lastName ?? ""}`.trim();
    items.push({
      id: ot.id,
      type: "overtime",
      title: "Overtime Request",
      subtitle: `${ot.requestedHours}h requested${ot.approvedHours ? ` · ${ot.approvedHours}h approved` : ""}`,
      employeeName: name,
      employeeId: ot.employee.id,
      status: ot.status,
      date: ot.createdAt,
      link: "/attendance",
    });
  }

  for (const exc of payrollExceptions) {
    const name = `${exc.employee.firstName ?? ""} ${exc.employee.lastName ?? ""}`.trim();
    items.push({
      id: exc.id,
      type: "payroll_exception",
      title: exc.type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      subtitle: `${exc.severity} · ${exc.payPeriod?.label ?? "Unknown period"}`,
      employeeName: name,
      employeeId: exc.employee.id,
      status: exc.resolved ? "RESOLVED" : "PENDING",
      date: exc.createdAt,
      link: "/payroll",
    });
  }

  for (const att of attendanceExceptions) {
    const name = `${att.employee.firstName ?? ""} ${att.employee.lastName ?? ""}`.trim();
    items.push({
      id: att.id,
      type: "attendance_exception",
      title: `${att.status} · ${new Date(att.date).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`,
      subtitle: `Scheduled ${att.scheduledStart ?? "?"}–${att.scheduledEnd ?? "?"}`,
      employeeName: name,
      employeeId: att.employee.id,
      status: att.status,
      date: att.date,
      link: "/attendance",
    });
  }

  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return items;
}
