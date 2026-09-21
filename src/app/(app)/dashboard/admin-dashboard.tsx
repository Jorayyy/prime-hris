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
import SidebarLayout from "../settings/settings-layout";

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

type WeeklyHours = {
  label: string;
  totalHours: number;
  overtimeHours: number;
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
  weeklyHours: WeeklyHours[];
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

function DonutChart({ segments, size = 120 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <p className="text-sm text-muted text-center py-8">No data</p>;
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;

  const arcs = segments.reduce<{ seg: typeof segments[number]; dash: number; offset: number }[]>((acc, seg) => {
    const pct = seg.value / total;
    const dash = pct * circ;
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
    acc.push({ seg, dash, offset });
    return acc;
  }, []);

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((arc) => (
          <circle
            key={arc.seg.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={arc.seg.color}
            strokeWidth="12"
            strokeDasharray={`${arc.dash} ${circ - arc.dash}`}
            strokeDashoffset={-arc.offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        ))}
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" className="fill-foreground text-lg font-bold">{total}</text>
        <text x={size / 2} y={size / 2 + 12} textAnchor="middle" className="fill-muted text-[10px]">total</text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-muted">{seg.label}</span>
            <span className="font-bold tabular-nums ml-auto">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChartHorizontal({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-foreground truncate">{d.label}</span>
            <span className="tabular-nums text-muted">{d.value}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? "var(--primary)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function BarChartVertical({ data }: { data: WeeklyHours[] }) {
  const max = Math.max(...data.map((d) => d.totalHours), 1);
  return (
    <div className="flex items-end gap-3 h-36">
      {data.map((d) => {
        const h = (d.totalHours / max) * 100;
        const oh = (d.overtimeHours / max) * 100;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative" style={{ height: "100%" }}>
              <div
                className="absolute bottom-0 w-full rounded-t-lg bg-primary/80 transition-all duration-500"
                style={{ height: `${h}%` }}
              />
              {oh > 0 && (
                <div
                  className="absolute bottom-0 w-full rounded-t-lg bg-warning transition-all duration-500"
                  style={{ height: `${oh}%` }}
                />
              )}
            </div>
            <p className="text-[10px] text-muted font-medium">{d.label}</p>
            <p className="text-xs font-bold tabular-nums">{d.totalHours.toFixed(0)}h</p>
          </div>
        );
      })}
    </div>
  );
}

function PayrollRing({ processed, total }: { processed: number; total: number }) {
  const pct = total > 0 ? (processed / total) * 100 : 0;
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={104} height={104} viewBox="0 0 104 104">
        <circle cx={52} cy={52} r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx={52}
          cy={52}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="10"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <text x={52} y={48} textAnchor="middle" className="fill-foreground text-xl font-bold">{Math.round(pct)}%</text>
        <text x={52} y={62} textAnchor="middle" className="fill-muted text-[10px]">{processed}/{total}</text>
      </svg>
    </div>
  );
}

export default function AdminDashboard({
  user,
  stats,
  exceptions,
  departmentStats,
  payrollStatus,
  recentActivity,
  isPayroll,
  weeklyHours,
}: Props) {
  const today = new Date();

  const statCards = [
    { label: "Total Employees", value: stats.totalEmployees, icon: Users, href: "/employees", color: "text-primary", bg: "bg-primary/10" },
    { label: "Present Today", value: stats.presentToday, icon: UserCheck, href: "/attendance", color: "text-success", bg: "bg-success/10" },
    { label: "Late", value: stats.lateToday, icon: Clock, href: "/attendance", color: "text-warning-dark", bg: "bg-warning/10" },
    { label: "Absent", value: stats.absentToday, icon: UserX, href: "/attendance", color: "text-danger", bg: "bg-danger/10" },
    { label: "On Leave", value: stats.onLeaveToday, icon: CalendarOff, href: "/leaves", color: "text-info-dark", bg: "bg-info/10" },
    { label: "Pending Actions", value: stats.totalPending, icon: AlertTriangle, href: "/leaves", color: stats.totalPending > 0 ? "text-warning-dark" : "text-muted", bg: stats.totalPending > 0 ? "bg-warning/10" : "bg-muted/10" },
  ];

  const overviewTab = (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="p-3 hover:shadow-sm transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums text-foreground">{card.value}</p>
                  <p className="text-xs font-medium text-muted truncate">{card.label}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Today&apos;s Attendance</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Present", value: stats.presentToday, color: "text-success" },
              { label: "Late", value: stats.lateToday, color: "text-warning-dark" },
              { label: "Absent", value: stats.absentToday, color: "text-danger" },
              { label: "On Leave", value: stats.onLeaveToday, color: "text-info-dark" },
              { label: "Not Clocked In", value: stats.notClockedIn, color: stats.notClockedIn > 0 ? "text-danger" : "text-muted" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-slate-50 p-3 text-center">
                <p className={`text-2xl font-bold tabular-nums ${item.color}`}>{item.value}</p>
                <p className="text-[11px] text-muted mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Pending Actions</h3>
            <div className="space-y-1">
              <Link href="/leaves" className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-surface-hover transition-colors">
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-4 w-4 text-muted" />
                  <span className="text-sm text-foreground">Leave Requests</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold tabular-nums ${stats.pendingLeaves > 0 ? "text-warning-dark" : "text-muted"}`}>{stats.pendingLeaves}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted" />
                </div>
              </Link>
              <Link href="/leaves" className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-surface-hover transition-colors">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted" />
                  <span className="text-sm text-foreground">Overtime Requests</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold tabular-nums ${stats.pendingOvertime > 0 ? "text-warning-dark" : "text-muted"}`}>{stats.pendingOvertime}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted" />
                </div>
              </Link>
              {isPayroll && (
                <Link href="/payroll" className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-surface-hover transition-colors">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-4 w-4 text-muted" />
                    <span className="text-sm text-foreground">Payroll Exceptions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold tabular-nums ${stats.pendingPayrollExceptions > 0 ? "text-danger" : "text-muted"}`}>{stats.pendingPayrollExceptions}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted" />
                  </div>
                </Link>
              )}
            </div>
          </div>
        </Card>

        {isPayroll && payrollStatus ? (
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Payroll Status</h3>
                <Link href={`/payroll/${payrollStatus.id}`} className="text-xs font-medium text-primary hover:text-primary-dark">View</Link>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{payrollStatus.periodLabel}</p>
                  <p className="text-xs text-muted">Pay date: {new Date(payrollStatus.payDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted">Processed</span>
                    <span className="font-medium text-foreground tabular-nums">{payrollStatus.processed} / {payrollStatus.total}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${payrollStatus.total > 0 ? (payrollStatus.processed / payrollStatus.total) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">Status</span>
                  <Badge variant={payrollStatusColor[payrollStatus.status] as any || "gray"} size="sm">{payrollStatus.status.replace(/_/g, " ")}</Badge>
                </div>
                {payrollStatus.exceptions > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">Exceptions</span>
                    <span className="text-xs font-bold text-danger tabular-nums">{payrollStatus.exceptions}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Payroll Status</h3>
              <p className="text-sm text-muted">No active pay period.</p>
            </div>
          </Card>
        )}

        <Card>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Quick Links</h3>
            <div className="space-y-1">
              {[
                { href: "/employees/new", label: "+ New Employee", color: "text-primary" },
                { href: "/schedules", label: "Manage Schedules", color: "text-primary" },
                { href: "/attendance", label: "Attendance Records", color: "text-primary" },
                { href: "/audit", label: "Audit Log", color: "text-primary" },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-surface-hover transition-colors">
                  <span className={`text-sm font-medium ${link.color}`}>{link.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted" />
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const analyticsTab = (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Attendance Today</h3>
          <DonutChart
            segments={[
              { label: "Present", value: stats.presentToday - stats.lateToday, color: "#22c55e" },
              { label: "Late", value: stats.lateToday, color: "#f59e0b" },
              { label: "Absent", value: stats.absentToday, color: "#ef4444" },
              { label: "On Leave", value: stats.onLeaveToday, color: "#3b82f6" },
            ].filter((s) => s.value > 0)}
          />
        </div>
      </Card>

      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Headcount by Department</h3>
          <BarChartHorizontal
            data={departmentStats.map((d) => ({
              label: d.name,
              value: d.total,
              color: d.coverage >= 80 ? "#22c55e" : d.coverage >= 50 ? "#f59e0b" : "#ef4444",
            }))}
          />
        </div>
      </Card>

      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Weekly Hours Trend</h3>
          <BarChartVertical data={weeklyHours} />
        </div>
      </Card>

      <Card>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Department Coverage</h3>
          <div className="space-y-2">
            {departmentStats.map((dept) => (
              <div key={dept.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground truncate">{dept.name}</span>
                  <span className="tabular-nums text-muted">{dept.present}/{dept.total} · {dept.coverage}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${dept.coverage >= 80 ? "bg-success" : dept.coverage >= 50 ? "bg-warning" : "bg-danger"}`}
                    style={{ width: `${dept.coverage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {isPayroll && payrollStatus && (
        <Card className="lg:col-span-2">
          <div className="p-4 flex items-center gap-8">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Payroll Progress</h3>
              <p className="text-xs text-muted">{payrollStatus.periodLabel}</p>
            </div>
            <PayrollRing processed={payrollStatus.processed} total={payrollStatus.total} />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Status</span>
                <Badge variant={payrollStatusColor[payrollStatus.status] as any || "gray"} size="sm">{payrollStatus.status.replace(/_/g, " ")}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Pay Date</span>
                <span className="font-medium">{new Date(payrollStatus.payDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
              {payrollStatus.exceptions > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Exceptions</span>
                  <span className="font-bold text-danger">{payrollStatus.exceptions}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  const activityTab = (
    <div className="space-y-4">
      {exceptions.length > 0 && (
        <Card>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Attendance Exceptions</h3>
            <Link href="/attendance" className="text-xs font-medium text-primary hover:text-primary-dark">View All</Link>
          </div>
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
                  <tr key={ex.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{ex.employeeName}</p>
                      <p className="text-xs text-muted">{ex.employeeNumber}</p>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{ex.department}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted">{ex.schedule}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-foreground">{ex.clockIn || "—"}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={statusTone(ex.status) as any} size="sm">
                        {statusLabel[ex.status] || ex.status}
                        {ex.lateMinutes > 0 && ` (${ex.lateMinutes}m)`}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {recentActivity.length > 0 && (
        <Card>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            <Link href="/audit" className="text-xs font-medium text-primary hover:text-primary-dark">View All</Link>
          </div>
          <div className="divide-y divide-border">
            {recentActivity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors">
                <Activity className="h-3.5 w-3.5 text-muted flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">
                    <span className="font-medium">{a.userName}</span>{" "}
                    <span className="text-muted">{formatAction(a.action)}</span>{" "}
                    <span className="text-muted">{formatEntity(a.entity)}</span>
                  </p>
                </div>
                <span className="text-xs text-muted whitespace-nowrap">{timeAgo(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {exceptions.length === 0 && recentActivity.length === 0 && (
        <Card>
          <div className="p-8 text-center">
            <p className="text-sm text-muted">No exceptions or recent activity.</p>
          </div>
        </Card>
      )}
    </div>
  );

  const sections = [
    { id: "overview", title: "Overview", subtitle: "Key metrics at a glance", content: overviewTab },
    { id: "analytics", title: "Analytics", subtitle: "Charts and trends", content: analyticsTab },
    { id: "activity", title: "Activity", subtitle: "Exceptions and audit trail", content: activityTab },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Welcome back, {user.firstName || "Admin"}!</h1>
          <p className="text-sm text-muted">{formatDate(today)}</p>
        </div>
      </div>
      <SidebarLayout sections={sections} />
    </div>
  );
}
