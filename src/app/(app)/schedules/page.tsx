import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, HR_ROLES } from "@/lib/auth";
import { Card, EmptyState } from "@/components/ui";
import { nightDiffMinutesForShift } from "@/lib/time";
import ScheduleForm from "./schedule-form";
import RotationScheduleForm from "./rotation-form";
import ScheduleCalendarWrapper from "./schedule-calendar-wrapper";
import SidebarLayout from "../settings/settings-layout";

export const metadata = { title: "Schedules" };

export default async function SchedulesPage() {
  const user = (await getSessionUser())!;
  if (!HR_ROLES.includes(user.role)) notFound();

  const [templates, employees] = await Promise.all([
    db.shiftTemplate.findMany({ where: { isActive: true }, orderBy: { startTime: "asc" } }),
    db.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, employeeNumber: true, campaign: { select: { name: true } } },
      orderBy: [{ campaign: { name: "asc" } }, { lastName: "asc" }],
    }),
  ]);

  const today = new Date();
  const weekLater = new Date(today);
  weekLater.setDate(weekLater.getDate() + 6);

  const sections = [
    {
      id: "templates",
      title: "Shift Templates",
      subtitle: "Available shift patterns and their night diff info",
      content: (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      ),
    },
    {
      id: "calendar",
      title: "Calendar",
      subtitle: "Employee schedule at a glance",
      content: <ScheduleCalendarWrapper employees={employees} />,
    },
    {
      id: "assign",
      title: "Assign Shifts",
      subtitle: "Bulk assignment and repeating rotation patterns",
      content: (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="space-y-4 p-5">
              <div>
                <p className="text-sm font-bold">Bulk Assignment</p>
                <p className="text-xs text-[var(--muted)]">Assign a template (or rest day) to employees over a date range.</p>
              </div>
              <ScheduleForm
                templates={templates.map((t) => ({ id: t.id, name: t.name }))}
                employees={employees}
                defaultStart={today.toISOString().slice(0, 10)}
                defaultEnd={weekLater.toISOString().slice(0, 10)}
              />
            </div>
          </Card>
          <Card>
            <div className="space-y-4 p-5">
              <div>
                <p className="text-sm font-bold">Rotation Schedule</p>
                <p className="text-xs text-[var(--muted)]">Set up weekly or custom repeating patterns for employees.</p>
              </div>
              <RotationScheduleForm
                templates={templates}
                employees={employees}
                defaultStart={today.toISOString().slice(0, 10)}
                defaultEnd={weekLater.toISOString().slice(0, 10)}
              />
            </div>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Schedules</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          View and manage employee shift assignments.
        </p>
      </div>
      <SidebarLayout sections={sections} />
    </div>
  );
}
