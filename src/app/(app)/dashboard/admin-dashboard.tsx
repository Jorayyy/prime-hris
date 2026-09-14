"use client";

import Link from "next/link";
import {
  Users,
  UserCheck,
  Clock,
  UserX,
  CalendarOff,
  AlertTriangle,
  ChevronRight,
  CalendarClock,
  Wallet,
  Activity,
} from "lucide-react";
import { Card, Badge, statusTone } from "@/components/ui";
import { formatDate } from "@/lib/format";

type Exception = {
  id: string;
  employeeName: string;
  employeeNumber: string;
  department: string;
  schedule: string;
  clockIn: string | null;
  status: string;
  lateMinutes: number;
};

type DeptStat = {
  name: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  coverage: number;
};

type PayrollStatus = {
  periodLabel: string;
  status: string;
  processed: number;
  total: number;
  exceptions: number;
  payDate: Date;
  id: string;
} | null;

type Activity = {
  id: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

type Props = {
  user: { firstName?: string | null; email: string };
  stats: {
    totalEmployees: number;
    presentToday: number;
    lateToday: number;
    absentToday: number;
    onLeaveToday: number;
    notClockedIn: number;
    pendingLeaves: number;
    pendingOvertime: number;
    pendingPayrollExceptions: number;
    totalPending: number;
  };
  exceptions: Exception[];
  departmentStats: DeptStat[];
  payrollStatus: PayrollStatus;
  recentActivity: Activity[];
  isPayroll: boolean;
};

const statusLabel: Record<string, string> = {
  PRESENT: "Present",
  LATE: "Late",
  ABSENT: "Absent",
  ON_LEAVE: "On Leave",
  INCOMPLETE: "Incomplete",
  REST_DAY: "Rest Day",
};

const payrollStatusColor: Record<string, string> = {
  DRAFT: "gray",
  PROCESSING: "blue",
  FOR_APPROVAL: "amber",
  APPROVED: "green",
  PAID: "green",
  LOCKED: "gray",
  CANCELLED: "red",
};

function formatAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEntity(entity: string): string {
  return entity
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminDashboard({
  user,
  stats,
  exceptions,
  departmentStats,
  payrollStatus,
  recentActivity,
  isPayroll,
}: Props) {
  const today = new Date();

  const statCards = [
    {
      label: "Total Employees",
      value: stats.totalEmployees,
      icon: Users,
      href: "/employees",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Present Today",
      value: stats.presentToday,
      icon: UserCheck,
      href: "/attendance",
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Late",
      value: stats.lateToday,
      icon: Clock,
      href: "/attendance",
      color: "text-warning-dark",
      bg: "bg-warning/10",
    },
    {
      label: "Absent",
      value: stats.absentToday,
      icon: UserX,
      href: "/attendance",
      color: "text-danger",
      bg: "bg-danger/10",
    },
    {
      label: "On Leave",
      value: stats.onLeaveToday,
      icon: CalendarOff,
      href: "/leaves",
      color: "text-info-dark",
      bg: "bg-info/10",
    },
    {
      label: "Pending Actions",
      value: stats.totalPending,
      icon: AlertTriangle,
      href: "/leaves",
      color: stats.totalPending > 0 ? "text-warning-dark" : "text-muted",
      bg: stats.totalPending > 0 ? "bg-warning/10" : "bg-muted/10",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Welcome back, {user.firstName || "Admin"}!
          </h1>
          <p className="text-sm text-muted">{formatDate(today)}</p>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Link
            href="/employees/new"
            className="rounded-lg px-3 py-1.5 font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            + Employee
          </Link>
          <Link
            href="/schedules"
            className="rounded-lg px-3 py-1.5 font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            Schedule
          </Link>
          <Link
            href="/leaves"
            className="rounded-lg px-3 py-1.5 font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            Approvals
          </Link>
          <Link
            href="/payroll"
            className="rounded-lg px-3 py-1.5 font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            Payroll
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="p-3 hover:shadow-sm transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}
                >
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums text-foreground">
                    {card.value}
                  </p>
                  <p className="text-xs font-medium text-muted truncate">
                    {card.label}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Attendance Today */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Summary */}
        <Card className="lg:col-span-1">
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Today&apos;s Attendance
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Present</span>
                <span className="text-sm font-bold tabular-nums text-success">
                  {stats.presentToday}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Late</span>
                <span className="text-sm font-bold tabular-nums text-warning-dark">
                  {stats.lateToday}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Absent</span>
                <span className="text-sm font-bold tabular-nums text-danger">
                  {stats.absentToday}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">On Leave</span>
                <span className="text-sm font-bold tabular-nums text-info-dark">
                  {stats.onLeaveToday}
                </span>
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted">
                    Not Clocked In
                  </span>
                  <span
                    className={`text-sm font-bold tabular-nums ${stats.notClockedIn > 0 ? "text-danger" : "text-muted"}`}
                  >
                    {stats.notClockedIn}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Exceptions Table */}
        <Card className="lg:col-span-4">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Attendance Exceptions
            </h3>
            <Link
              href="/attendance"
              className="text-xs font-medium text-primary hover:text-primary-dark"
            >
              View All
            </Link>
          </div>
          {exceptions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted">
                No attendance issues today. All good!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted">
                    <th className="px-4 py-2.5">Employee</th>
                    <th className="px-4 py-2.5">Department</th>
                    <th className="px-4 py-2.5">Schedule</th>
                    <th className="px-4 py-2.5">Clock In</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {exceptions.map((ex) => (
                    <tr
                      key={ex.id}
                      className="hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <div>
                          <p className="font-medium text-foreground">
                            {ex.employeeName}
                          </p>
                          <p className="text-xs text-muted">
                            {ex.employeeNumber}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted">
                        {ex.department}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted">
                        {ex.schedule}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-foreground">
                        {ex.clockIn || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={statusTone(ex.status) as any}
                          size="sm"
                        >
                          {statusLabel[ex.status] || ex.status}
                          {ex.lateMinutes > 0 && ` (${ex.lateMinutes}m)`}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Pending Actions + Payroll Status */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pending Actions */}
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Pending Actions
            </h3>
            <div className="space-y-1">
              <Link
                href="/leaves"
                className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-4 w-4 text-muted" />
                  <span className="text-sm text-foreground">
                    Leave Requests
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold tabular-nums ${stats.pendingLeaves > 0 ? "text-warning-dark" : "text-muted"}`}
                  >
                    {stats.pendingLeaves}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted" />
                </div>
              </Link>
              <Link
                href="/leaves"
                className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted" />
                  <span className="text-sm text-foreground">
                    Overtime Requests
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold tabular-nums ${stats.pendingOvertime > 0 ? "text-warning-dark" : "text-muted"}`}
                  >
                    {stats.pendingOvertime}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted" />
                </div>
              </Link>
              {isPayroll && (
                <Link
                  href="/payroll"
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="h-4 w-4 text-muted" />
                    <span className="text-sm text-foreground">
                      Payroll Exceptions
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold tabular-nums ${stats.pendingPayrollExceptions > 0 ? "text-danger" : "text-muted"}`}
                    >
                      {stats.pendingPayrollExceptions}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted" />
                  </div>
                </Link>
              )}
            </div>
          </div>
        </Card>

        {/* Payroll Status */}
        {isPayroll && payrollStatus ? (
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Payroll Status
                </h3>
                <Link
                  href={`/payroll/${payrollStatus.id}`}
                  className="text-xs font-medium text-primary hover:text-primary-dark"
                >
                  View
                </Link>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {payrollStatus.periodLabel}
                  </p>
                  <p className="text-xs text-muted">
                    Pay date:{" "}
                    {new Date(payrollStatus.payDate).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted">Processed</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {payrollStatus.processed} / {payrollStatus.total}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${payrollStatus.total > 0 ? (payrollStatus.processed / payrollStatus.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Status</span>
                  <Badge
                    variant={
                      payrollStatusColor[payrollStatus.status] as any || "gray"
                    }
                    size="sm"
                  >
                    {payrollStatus.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {payrollStatus.exceptions > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Exceptions</span>
                    <span className="text-xs font-bold text-danger tabular-nums">
                      {payrollStatus.exceptions}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Payroll Status
              </h3>
              <p className="text-sm text-muted">No active pay period.</p>
            </div>
          </Card>
        )}

        {/* Department Overview */}
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Department Coverage
            </h3>
            {departmentStats.length === 0 ? (
              <p className="text-sm text-muted">No departments.</p>
            ) : (
              <div className="space-y-2">
                {departmentStats.map((dept) => (
                  <div key={dept.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground truncate">
                        {dept.name}
                      </span>
                      <span className="tabular-nums text-muted">
                        {dept.present}/{dept.total} · {dept.coverage}%
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${dept.coverage >= 80 ? "bg-success" : dept.coverage >= 50 ? "bg-warning" : "bg-danger"}`}
                        style={{ width: `${dept.coverage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Recent Activity
            </h3>
            <Link
              href="/audit"
              className="text-xs font-medium text-primary hover:text-primary-dark"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors"
              >
                <Activity className="h-3.5 w-3.5 text-muted flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">
                    <span className="font-medium">{a.userName}</span>{" "}
                    <span className="text-muted">
                      {formatAction(a.action)}
                    </span>{" "}
                    <span className="text-muted">
                      {formatEntity(a.entity)}
                    </span>
                  </p>
                </div>
                <span className="text-xs text-muted whitespace-nowrap">
                  {timeAgo(a.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
