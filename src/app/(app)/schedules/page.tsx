import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { nightDiffMinutesForShift } from "@/lib/time";
import ScheduleForm from "./schedule-form";
import RotationScheduleForm from "./rotation-form";
import ScheduleCalendarWrapper from "./schedule-calendar-wrapper";

export const metadata = { title: "Schedules" };

export default async function SchedulesPage() {
  const user = (await getSessionUser())!;
  if (!["SUPER_ADMIN", "ADMIN", "HR"].includes(user.role)) {
    return <EmptyState title="Not authorized" hint="Schedules are managed by HR." />;
  }

  const [templates, employees, assignments] = await Promise.all([
    db.shiftTemplate.findMany({ where: { isActive: true }, orderBy: { startTime: "asc" } }),
    db.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, employeeNumber: true, campaign: { select: { name: true } } },
      orderBy: [{ campaign: { name: "asc" } }, { lastName: "asc" }],
    }),
    db.shiftAssignment.findMany({
      where: {
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
        },
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
        shiftTemplate: { select: { id: true, name: true, startTime: true, endTime: true, color: true } },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  const today = new Date();
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 6);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Shift Schedules</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Templates, bulk assignment, rotation patterns, and calendar views for BPO shifts.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {templates.map((t) => {
          const nd = t.isNightShift ? nightDiffMinutesForShift(t.startTime, t.endTime) : 0;
          return (
            <div key={t.id} className="rounded-xl border border-[var(--border)] bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                {nd > 0 ? (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    ND {Math.round(nd / 60 * 10) / 10}h
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm font-bold">{t.name}</p>
              <p className="font-mono text-xs text-[var(--muted)]">
                {t.startTime} → {t.endTime}{Number(t.breakMinutes) ? ` · break ${t.breakMinutes}m` : ""}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Grace period: {t.graceMinutes} min</p>
            </div>
          );
        })}
        {templates.length === 0 ? (
          <EmptyState title="No shift templates" hint="Run the seed script or create templates in Settings." />
        ) : null}
      </div>

      <div className="mb-6">
        <ScheduleCalendarWrapper
          assignments={assignments.map((a) => ({
            id: a.id,
            date: a.date.toISOString().slice(0, 10),
            employeeId: a.employeeId,
            employee: a.employee,
            shiftTemplate: a.shiftTemplate,
            customStart: a.customStart,
            customEnd: a.customEnd,
            isRestDay: a.isRestDay,
          }))}
          employees={employees}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Bulk Assignment"
            subtitle="Assign a template (or rest day) to employees over a date range."
          />
          <ScheduleForm
            templates={templates.map((t) => ({ id: t.id, name: t.name }))}
            employees={employees}
            defaultStart={today.toISOString().slice(0, 10)}
            defaultEnd={weekLater.toISOString().slice(0, 10)}
          />
        </Card>

        <Card>
          <CardHeader
            title="Rotation Schedule"
            subtitle="Set up weekly or custom repeating patterns for employees."
          />
          <RotationScheduleForm
            templates={templates}
            employees={employees}
            defaultStart={today.toISOString().slice(0, 10)}
            defaultEnd={weekLater.toISOString().slice(0, 10)}
          />
        </Card>
      </div>
    </>
  );
}
