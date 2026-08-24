import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { Card, CardHeader, EmptyState, Badge } from "@/components/ui";
import { nightDiffMinutesForShift } from "@/lib/time";
import Link from "next/link";

export const metadata = { title: "Employee Schedule" };

export default async function EmployeeSchedulePage({ params }: { params: Promise<{ employeeId: string }> }) {
  const user = (await getSessionUser())!;
  if (!["SUPER_ADMIN", "ADMIN", "HR"].includes(user.role)) {
    return <EmptyState title="Not authorized" hint="Schedules are managed by HR." />;
  }

  const { employeeId } = await params;

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeNumber: true,
      campaign: { select: { name: true } },
      department: { select: { name: true } },
      position: { select: { title: true } },
    },
  });

  if (!employee) {
    return <EmptyState title="Employee not found" hint="The employee does not exist." />;
  }

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const assignments = await db.shiftAssignment.findMany({
    where: {
      employeeId,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    include: { shiftTemplate: true },
    orderBy: { date: "asc" },
  });

  const stats = {
    total: assignments.length,
    restDays: assignments.filter((a) => a.isRestDay).length,
    workingDays: assignments.filter((a) => !a.isRestDay && a.shiftTemplate).length,
    nightShifts: assignments.filter((a) => a.shiftTemplate?.isNightShift).length,
  };

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <Link href="/schedules" className="hover:underline">Schedules</Link>
          <span>/</span>
          <span>Employee</span>
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight">
          {employee.lastName}, {employee.firstName}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {employee.employeeNumber}
          {employee.campaign ? ` · ${employee.campaign.name}` : ""}
          {employee.department ? ` · ${employee.department.name}` : ""}
          {employee.position ? ` · ${employee.position.title}` : ""}
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <p className="text-xs font-medium text-[var(--muted)]">Total Assignments</p>
          <p className="mt-1 text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <p className="text-xs font-medium text-[var(--muted)]">Working Days</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.workingDays}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <p className="text-xs font-medium text-[var(--muted)]">Rest Days</p>
          <p className="mt-1 text-2xl font-bold text-slate-500">{stats.restDays}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-4">
          <p className="text-xs font-medium text-[var(--muted)]">Night Shifts</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600">{stats.nightShifts}</p>
        </div>
      </div>

      <Card>
        <CardHeader
          title={`${today.toLocaleString("default", { month: "long", year: "numeric" })} Schedule`}
          subtitle={`${assignments.length} assignments this month`}
        />
        <div className="p-5">
          {assignments.length === 0 ? (
            <p className="text-center text-sm text-[var(--muted)]">No schedule assignments for this month.</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => {
                const date = new Date(a.date);
                const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
                const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const nd = a.shiftTemplate?.isNightShift && a.shiftTemplate
                  ? nightDiffMinutesForShift(a.shiftTemplate.startTime, a.shiftTemplate.endTime)
                  : 0;

                return (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
                    <div className="flex items-center gap-4">
                      <div className="w-16 text-center">
                        <p className="text-xs font-bold text-slate-400">{dayName}</p>
                        <p className="text-sm font-semibold">{dateStr}</p>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      {a.isRestDay ? (
                        <Badge tone="gray">Rest Day</Badge>
                      ) : a.shiftTemplate ? (
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ background: a.shiftTemplate.color }} />
                          <div>
                            <p className="text-sm font-semibold">{a.shiftTemplate.name}</p>
                            <p className="font-mono text-xs text-[var(--muted)]">
                              {a.shiftTemplate.startTime} → {a.shiftTemplate.endTime}
                              {Number(a.shiftTemplate.breakMinutes) ? ` · break ${a.shiftTemplate.breakMinutes}m` : ""}
                            </p>
                          </div>
                          {nd > 0 ? (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                              ND {Math.round(nd / 60 * 10) / 10}h
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">
                          Custom: {a.customStart} → {a.customEnd}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
