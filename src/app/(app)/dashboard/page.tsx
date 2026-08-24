import Link from "next/link";
import {
  Users,
  CalendarClock,
  CalendarDays,
  Wallet,
  ArrowRight,
  LogIn,
  LogOut,
} from "lucide-react";
import { db } from "@/lib/db";
import { getSessionUser, MANAGEMENT_ROLES } from "@/lib/auth";
import { Card, CardHeader, Badge, statusTone } from "@/components/ui";
import { formatDate, formatTime, minutesToHoursMinutes } from "@/lib/format";

export const metadata = { title: "Dashboard" };

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {sub ? <p className="mt-1 text-xs text-[var(--muted)]">{sub}</p> : null}
    </div>
  );
}

export default async function DashboardPage() {
  const user = (await getSessionUser())!;
  const isManagement = MANAGEMENT_ROLES.includes(user.role);

  // Personal context
  const me = user.employeeId
    ? await db.employee.findUnique({
        where: { id: user.employeeId },
        include: { position: true, campaign: true },
      })
    : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [myPunches, pendingLeaves] = await Promise.all([
    me
      ? db.timeLog.findMany({
          where: { employeeId: me.id, workDate: { gte: today, lt: tomorrow } },
          orderBy: { timestamp: "asc" },
        })
      : Promise.resolve([]),
    isManagement || user.role === "MANAGER"
      ? db.leaveRequest.count({ where: { status: "PENDING" } })
      : Promise.resolve(0),
  ]);

  const lastIn = myPunches.filter((p) => p.type === "CLOCK_IN").at(-1);
  const lastOut = myPunches.filter((p) => p.type === "CLOCK_OUT").at(-1);

  // Org-wide stats for management
  const [activeCount, onLeaveToday, presentToday, lateToday] = isManagement
    ? await Promise.all([
        db.employee.count({ where: { status: "ACTIVE" } }),
        db.leaveRequest.count({
          where: { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } },
        }),
        db.attendanceDaily.count({
          where: {
            workDate: today,
            status: { in: ["PRESENT", "LATE"] },
          },
        }),
        db.attendanceDaily.count({ where: { workDate: today, status: "LATE" } }),
      ])
    : [0, 0, 0, 0];

  const latestPeriod = isManagement
    ? await db.payPeriod.findFirst({
        orderBy: { startDate: "desc" },
        include: { _count: { select: { payslips: true } } },
      })
    : null;

  return (
    <>
      <h1 className="mb-1 text-xl font-bold tracking-tight">
        Welcome back{me ? `, ${me.firstName}` : ""}
      </h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        {formatDate(today)} · {isManagement ? "Management overview" : "Your workspace"}
      </p>

      {/* My attendance today */}
      <section className="mb-8">
        <Card>
          <CardHeader
            title="My Attendance Today"
            subtitle={
              me ? `${me.employeeNumber} · ${me.position?.title ?? ""} ${me.campaign ? `· ${me.campaign.name}` : ""}` : undefined
            }
          />
          <div className="grid grid-cols-2 divide-x divide-[var(--border)] sm:grid-cols-4">
            <div className="p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <LogIn className="h-3.5 w-3.5" /> Clock-in
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums">{lastIn ? formatTime(lastIn.timestamp) : "—"}</p>
            </div>
            <div className="p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
                <LogOut className="h-3.5 w-3.5" /> Clock-out
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums">{lastOut ? formatTime(lastOut.timestamp) : "—"}</p>
            </div>
            <div className="p-4">
              <p className="text-xs font-medium text-[var(--muted)]">Hours so far</p>
              <p className="mt-1 text-lg font-bold tabular-nums">
                {minutesToHoursMinutes(
                  lastOut && lastIn ? Math.round((lastOut.timestamp.getTime() - lastIn.timestamp.getTime()) / 60000) : 0,
                )}
              </p>
            </div>
            <div className="flex flex-col justify-between p-4">
              <p className="text-xs font-medium text-[var(--muted)]">Status</p>
              {!lastIn ? (
                <Badge tone="gray">Not clocked in</Badge>
              ) : !lastOut ? (
                <Badge tone="green">On shift</Badge>
              ) : (
                <Badge tone="blue">Shift done</Badge>
              )}
            </div>
          </div>
        </Card>
      </section>

      {isManagement ? (
        <>
          <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Active Employees" value={String(activeCount)} sub={`${onLeaveToday} on leave today`} icon={Users} />
            <StatCard label="Present Today" value={String(presentToday)} sub={`${lateToday} late arrivals`} icon={CalendarClock} />
            <StatCard label="Pending Leave Requests" value={String(pendingLeaves)} icon={CalendarDays} />
            <StatCard
              label="Latest Payroll"
              value={latestPeriod ? latestPeriod.status : "None"}
              sub={
                latestPeriod
                  ? `${formatDate(latestPeriod.startDate)} – ${formatDate(latestPeriod.endDate)} · ${latestPeriod._count.payslips} payslips`
                  : "No payroll processed yet"
              }
              icon={Wallet}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Quick Actions"
                action={
                  <Link href="/employees" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline">
                    All employees <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              />
              <ul className="divide-y divide-[var(--border)]">
                {[
                  { href: "/employees/new", label: "Onboard a new employee", desc: "Create a 201 record and account" },
                  { href: "/schedules", label: "Assign shift schedules", desc: "Templates for graveyard and day shifts" },
                  { href: "/leaves", label: "Review leave requests", desc: `${pendingLeaves} awaiting approval` },
                  { href: "/payroll", label: "Process payroll", desc: "Run contributions, NSD, and taxes" },
                ].map((a) => (
                  <li key={a.href}>
                    <Link href={a.href} className="flex items-center justify-between px-5 py-3 transition hover:bg-slate-50">
                      <div>
                        <p className="text-sm font-semibold">{a.label}</p>
                        <p className="text-xs text-[var(--muted)]">{a.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader title="Recent Leave Requests" />
              <RecentLeaves />
            </Card>
          </div>
        </>
      ) : null}
    </>
  );
}

async function RecentLeaves() {
  const leaves = await db.leaveRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { employee: true, leaveType: true },
  });

  if (leaves.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">No leave requests yet.</p>;
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {leaves.map((lr) => (
        <li key={lr.id} className="flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-sm font-semibold">
              {lr.employee.firstName} {lr.employee.lastName}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {lr.leaveType.name} · {formatDate(lr.startDate)} → {formatDate(lr.endDate)} · {Number(lr.days)}d
            </p>
          </div>
          <Badge tone={statusTone(lr.status)}>{lr.status}</Badge>
        </li>
      ))}
    </ul>
  );
}
