"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarClock,
  CalendarDays,
  Wallet,
  ArrowRight,
  LogIn,
  LogOut,
  Clock,
  CheckCircle,
  AlertCircle,
  UserRound,
} from "lucide-react";
import { Card, CardHeader, Badge, StatCard, ProgressBar } from "@/components/ui";
import { formatDate, formatTime, minutesToHoursMinutes } from "@/lib/format";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

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
  attendanceRate: number;
  nextPayDate: string | null;
};

export default function EmployeeDashboard({
  user,
  employee,
  todayAttendance,
  recentAttendance,
  leaveBalances,
  pendingLeavesCount,
  attendanceRate,
  nextPayDate,
}: Props) {
  const today = new Date();
  const now = new Date();
  const currentHour = now.getHours();

  // Determine if on shift (graveyard: 8PM-6AM)
  const isNightShift = currentHour >= 20 || currentHour < 6;
  const isOnShift = todayAttendance?.actualIn && !todayAttendance?.actualOut;

  const scheduledStart = todayAttendance?.scheduledStart || "20:00";
  const scheduledEnd = todayAttendance?.scheduledEnd || "06:00";

  // Calculate shift progress
  let shiftProgress = 0;
  if (todayAttendance?.actualIn) {
    const start = new Date(todayAttendance.actualIn).getTime();
    const totalShiftMs = 10 * 60 * 60 * 1000; // 10 hours
    const elapsed = now.getTime() - start;
    shiftProgress = Math.min(100, Math.max(0, Math.round((elapsed / totalShiftMs) * 100)));
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Welcome */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {employee.firstName}! 👋
        </h1>
        <p className="mt-1 text-sm text-muted">
          {formatDate(today)} · {employee.position} · {employee.campaign}
        </p>
      </motion.div>

      {/* Today's Attendance Card */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader
            title="My Shift Today"
            subtitle={`${employee.employeeNumber} · ${employee.department}`}
            action={
              isOnShift ? (
                <Badge variant="green" pulse>On Shift</Badge>
              ) : todayAttendance?.status === "PRESENT" || todayAttendance?.status === "LATE" ? (
                <Badge variant="gray">Shift Ended</Badge>
              ) : (
                <Badge variant="amber">No Punch Yet</Badge>
              )
            }
          />
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                  <LogIn className="h-6 w-6 text-success" />
                </div>
                <p className="text-xs font-semibold uppercase text-muted">Clock In</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {todayAttendance?.actualIn ? formatTime(new Date(todayAttendance.actualIn)) : "—"}
                </p>
                <p className="text-xs text-muted">Scheduled: {scheduledStart}</p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-info/10">
                  <LogOut className="h-6 w-6 text-info" />
                </div>
                <p className="text-xs font-semibold uppercase text-muted">Clock Out</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {todayAttendance?.actualOut ? formatTime(new Date(todayAttendance.actualOut)) : "—"}
                </p>
                <p className="text-xs text-muted">Scheduled: {scheduledEnd}</p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs font-semibold uppercase text-muted">Hours Worked</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {todayAttendance?.workedMinutes ? minutesToHoursMinutes(todayAttendance.workedMinutes) : "0:00"}
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                  <Clock className="h-6 w-6 text-warning-dark" />
                </div>
                <p className="text-xs font-semibold uppercase text-muted">Late</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {todayAttendance?.lateMinutes ? minutesToHoursMinutes(todayAttendance.lateMinutes) : "0:00"}
                </p>
              </div>
            </div>

            {/* Shift Progress */}
            {todayAttendance?.actualIn && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted">Shift Progress</span>
                  <span className="font-semibold text-foreground">{shiftProgress}%</span>
                </div>
                <ProgressBar value={shiftProgress} color="primary" size="md" />
                <p className="mt-2 text-xs text-muted">
                  {todayAttendance.actualOut
                    ? "Shift completed"
                    : `${Math.max(0, 100 - shiftProgress)}% remaining`}
                </p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/me">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <UserRound className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">My Space</p>
                <p className="text-xs text-muted">View profile & records</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted" />
            </div>
          </Card>
        </Link>
        <Link href="/leaves">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <CalendarClock className="h-6 w-6 text-warning-dark" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Request Leave</p>
                <p className="text-xs text-muted">{pendingLeavesCount} pending request(s)</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted" />
            </div>
          </Card>
        </Link>
        <Link href="/schedules">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/10">
                <CalendarDays className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">My Schedule</p>
                <p className="text-xs text-muted">View shift assignments</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted" />
            </div>
          </Card>
        </Link>
      </motion.div>

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Attendance */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader
              title="Recent Attendance"
              subtitle="Last 7 work days"
              action={
                <Link href="/attendance" className="text-xs font-semibold text-primary hover:text-primary-dark">
                  View All →
                </Link>
              }
            />
            <div className="divide-y divide-border">
              {recentAttendance.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-muted">No attendance records yet.</p>
              ) : (
                recentAttendance.map((a, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-surface-hover transition-colors">
                    <div className="flex items-center gap-3">
                      {a.status === "PRESENT" ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : a.status === "LATE" ? (
                        <Clock className="h-4 w-4 text-warning-dark" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-danger" />
                      )}
                      <span className="text-sm font-medium text-foreground">
                        {new Date(a.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.lateMinutes > 0 && (
                        <Badge variant="amber" size="sm">{a.lateMinutes}min late</Badge>
                      )}
                      <span className="text-sm tabular-nums text-muted">
                        {a.workedMinutes > 0 ? minutesToHoursMinutes(a.workedMinutes) : "—"}
                      </span>
                      <Badge
                        variant={a.status === "PRESENT" ? "green" : a.status === "LATE" ? "amber" : "red"}
                        size="sm"
                      >
                        {a.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </motion.div>

        {/* Leave Balances + Payday */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader
              title="Leave Balances"
              subtitle={`${today.getFullYear()} entitlement`}
            />
            <div className="p-5 space-y-4">
              {leaveBalances.length === 0 ? (
                <p className="text-center text-sm text-muted py-4">No leave balances.</p>
              ) : (
                leaveBalances.map((lb) => {
                  const remaining = lb.entitlement - lb.used;
                  const pct = lb.entitlement > 0 ? (lb.used / lb.entitlement) * 100 : 0;
                  return (
                    <div key={lb.code}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-foreground">{lb.name}</span>
                        <span className="text-muted">
                          {lb.used}/{lb.entitlement} days used
                        </span>
                      </div>
                      <ProgressBar
                        value={pct}
                        color={pct > 80 ? "danger" : pct > 50 ? "warning" : "success"}
                        size="sm"
                      />
                    </div>
                  );
                })
              )}

              {/* Next Payday */}
              {nextPayDate && (
                <div className="mt-6 rounded-xl bg-primary/5 p-4">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Next Payday</p>
                      <p className="text-xs text-muted">
                        {new Date(nextPayDate).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
