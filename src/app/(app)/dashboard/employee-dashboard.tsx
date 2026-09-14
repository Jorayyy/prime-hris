"use client";

import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  Wallet,
  LogIn,
  LogOut,
  Clock,
  CheckCircle,
  AlertCircle,
  UserRound,
} from "lucide-react";
import { Card, Badge, ProgressBar } from "@/components/ui";
import { formatDate, formatTime, minutesToHoursMinutes } from "@/lib/format";

type Props = {
  user: { firstName?: string | null; email: string };
  employee: {
    firstName: string;
    lastName: string;
    employeeNumber: string;
    department: string;
    position: string;
    campaign: string;
  };
  todayAttendance: {
    status: string;
    scheduledStart: string;
    scheduledEnd: string;
    actualIn: string | null;
    actualOut: string | null;
    lateMinutes: number;
    workedMinutes: number;
  } | null;
  recentAttendance: Array<{
    date: string;
    status: string;
    lateMinutes: number;
    workedMinutes: number;
  }>;
  leaveBalances: Array<{
    code: string;
    name: string;
    used: number;
    entitlement: number;
  }>;
  pendingLeavesCount: number;
  nextPayDate: string | null;
};

export default function EmployeeDashboard({
  employee,
  todayAttendance,
  recentAttendance,
  leaveBalances,
  pendingLeavesCount,
  nextPayDate,
}: Props) {
  const today = new Date();
  const now = new Date();

  const isOnShift = todayAttendance?.actualIn && !todayAttendance?.actualOut;
  const scheduledStart = todayAttendance?.scheduledStart || "—";
  const scheduledEnd = todayAttendance?.scheduledEnd || "—";

  let shiftProgress = 0;
  if (todayAttendance?.actualIn) {
    const start = new Date(todayAttendance.actualIn).getTime();
    const totalShiftMs = 10 * 60 * 60 * 1000;
    const elapsed = now.getTime() - start;
    shiftProgress = Math.min(
      100,
      Math.max(0, Math.round((elapsed / totalShiftMs) * 100))
    );
  }

  return (
    <div className="space-y-4">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          Welcome back, {employee.firstName}!
        </h1>
        <p className="text-sm text-muted">
          {formatDate(today)} · {employee.position} · {employee.campaign}
        </p>
      </div>

      {/* Today's Attendance */}
      <Card>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              My Shift Today
            </h3>
            <p className="text-xs text-muted">
              {employee.employeeNumber} · {employee.department}
            </p>
          </div>
          {isOnShift ? (
            <Badge variant="green" pulse>
              On Shift
            </Badge>
          ) : todayAttendance?.status === "PRESENT" ||
            todayAttendance?.status === "LATE" ? (
            <Badge variant="gray">Shift Ended</Badge>
          ) : (
            <Badge variant="amber">No Punch Yet</Badge>
          )}
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-success/5 p-3 text-center">
              <LogIn className="mx-auto mb-1 h-4 w-4 text-success" />
              <p className="text-[10px] font-semibold uppercase text-muted">
                Clock In
              </p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {todayAttendance?.actualIn
                  ? formatTime(new Date(todayAttendance.actualIn))
                  : "—"}
              </p>
              <p className="text-[10px] text-muted">
                Sched: {scheduledStart}
              </p>
            </div>
            <div className="rounded-lg bg-info/5 p-3 text-center">
              <LogOut className="mx-auto mb-1 h-4 w-4 text-info" />
              <p className="text-[10px] font-semibold uppercase text-muted">
                Clock Out
              </p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {todayAttendance?.actualOut
                  ? formatTime(new Date(todayAttendance.actualOut))
                  : "—"}
              </p>
              <p className="text-[10px] text-muted">Sched: {scheduledEnd}</p>
            </div>
            <div className="rounded-lg bg-primary/5 p-3 text-center">
              <Clock className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="text-[10px] font-semibold uppercase text-muted">
                Hours Worked
              </p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {todayAttendance?.workedMinutes
                  ? minutesToHoursMinutes(todayAttendance.workedMinutes)
                  : "0h 0m"}
              </p>
            </div>
            <div className="rounded-lg bg-warning/5 p-3 text-center">
              <Clock className="mx-auto mb-1 h-4 w-4 text-warning-dark" />
              <p className="text-[10px] font-semibold uppercase text-muted">
                Late
              </p>
              <p className="text-lg font-bold tabular-nums text-foreground">
                {todayAttendance?.lateMinutes
                  ? minutesToHoursMinutes(todayAttendance.lateMinutes)
                  : "0h 0m"}
              </p>
            </div>
          </div>

          {todayAttendance?.actualIn && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted">Shift Progress</span>
                <span className="font-medium text-foreground tabular-nums">
                  {shiftProgress}%
                </span>
              </div>
              <ProgressBar
                value={shiftProgress}
                color="primary"
                size="sm"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        <Link href="/me">
          <Card className="p-3 hover:shadow-sm transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <UserRound className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">My Space</p>
                <p className="text-xs text-muted truncate">
                  Profile & records
                </p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/leaves">
          <Card className="p-3 hover:shadow-sm transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
                <CalendarClock className="h-4 w-4 text-warning-dark" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Leave
                </p>
                <p className="text-xs text-muted">
                  {pendingLeavesCount} pending
                </p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/schedules">
          <Card className="p-3 hover:shadow-sm transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10">
                <CalendarDays className="h-4 w-4 text-info" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Schedule
                </p>
                <p className="text-xs text-muted">Shifts</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent Attendance + Leave Balances */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Attendance */}
        <Card>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Recent Attendance
            </h3>
            <Link
              href="/attendance"
              className="text-xs font-medium text-primary hover:text-primary-dark"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentAttendance.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">
                No attendance records yet.
              </p>
            ) : (
              recentAttendance.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {a.status === "PRESENT" ? (
                      <CheckCircle className="h-3.5 w-3.5 text-success" />
                    ) : a.status === "LATE" ? (
                      <Clock className="h-3.5 w-3.5 text-warning-dark" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-danger" />
                    )}
                    <span className="text-sm text-foreground">
                      {new Date(a.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.lateMinutes > 0 && (
                      <Badge variant="amber" size="sm">
                        {a.lateMinutes}m late
                      </Badge>
                    )}
                    <span className="text-xs tabular-nums text-muted">
                      {a.workedMinutes > 0
                        ? minutesToHoursMinutes(a.workedMinutes)
                        : "—"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Leave Balances + Payday */}
        <Card>
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Leave Balances · {today.getFullYear()}
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {leaveBalances.length === 0 ? (
              <p className="text-center text-sm text-muted py-2">
                No leave balances.
              </p>
            ) : (
              leaveBalances.map((lb) => {
                const pct =
                  lb.entitlement > 0
                    ? (lb.used / lb.entitlement) * 100
                    : 0;
                return (
                  <div key={lb.code}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">
                        {lb.name}
                      </span>
                      <span className="tabular-nums text-muted">
                        {lb.used}/{lb.entitlement}
                      </span>
                    </div>
                    <ProgressBar
                      value={pct}
                      color={
                        pct > 80 ? "danger" : pct > 50 ? "warning" : "success"
                      }
                      size="sm"
                    />
                  </div>
                );
              })
            )}

            {nextPayDate && (
              <div className="mt-2 rounded-lg bg-primary/5 p-3">
                <div className="flex items-center gap-2.5">
                  <Wallet className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Next Payday
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(nextPayDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
