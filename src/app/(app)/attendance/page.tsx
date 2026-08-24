import { db } from "@/lib/db";
import { getSessionUser, MANAGEMENT_ROLES } from "@/lib/auth";
import { Card, CardHeader, Badge, statusTone, EmptyState } from "@/components/ui";
import { formatDateOnly, formatTime, minutesToHoursMinutes, fullName } from "@/lib/format";
import ManualLogForm from "./manual-log-form";

export const metadata = { title: "Time & Attendance" };

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = (await getSessionUser())!;
  if (!MANAGEMENT_ROLES.includes(user.role)) {
    return <EmptyState title="Not authorized" hint="Attendance board is for managers and HR." />;
  }

  const sp = await searchParams;
  const dateParam = typeof sp.date === "string" ? sp.date : formatDateOnly(new Date());
  const dayStart = new Date(`${dateParam}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [rows, employees] = await Promise.all([
    db.attendanceDaily.findMany({
      where: { workDate: { gte: dayStart, lt: dayEnd } },
      include: { employee: { include: { campaign: true } } },
      orderBy: [{ employee: { lastName: "asc" } }],
    }),
    db.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, employeeNumber: true },
      orderBy: { lastName: "asc" },
    }),
  ]);

  const summary = rows.reduce(
    (acc, r) => {
      acc.total++;
      if (r.status === "PRESENT") acc.present++;
      else if (r.status === "LATE") acc.late++;
      else if (r.status === "INCOMPLETE") acc.incomplete++;
      return acc;
    },
    { total: 0, present: 0, late: 0, incomplete: 0 },
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Time &amp; Attendance</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Daily time records for {formatDateOnly(dayStart)} — punches resolve to shift dates even for graveyard shifts.
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <input type="date" name="date" defaultValue={dateParam} className="field w-auto" />
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
            View
          </button>
        </form>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-3">
        {[
          ["Records", summary.total],
          ["Present", summary.present],
          ["Late", summary.late],
          ["Incomplete", summary.incomplete],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-[var(--border)] bg-white p-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader
          title="Daily Time Record"
          subtitle={`${rows.length} record${rows.length === 1 ? "" : "s"} found for this date`}
        />
        {rows.length === 0 ? (
          <EmptyState title="No attendance yet" hint="Records appear once employees clock in via the bundy." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-5 py-3 font-semibold">Employee</th>
                  <th className="px-5 py-3 font-semibold">Schedule</th>
                  <th className="px-5 py-3 font-semibold">In / Out</th>
                  <th className="px-5 py-3 font-semibold">Worked</th>
                  <th className="px-5 py-3 font-semibold">Late</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3">
                      <span className="block font-semibold">{fullName(r.employee)}</span>
                      <span className="block text-xs text-[var(--muted)]">
                        {r.employee.employeeNumber} {r.employee.campaign ? `· ${r.employee.campaign.name}` : ""}
                      </span>
                    </td>
                    <td className="px-5 py-3 tabular-nums text-xs">
                      {r.scheduledStart ?? "—"} → {r.scheduledEnd ?? "—"}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-xs">
                      {formatTime(r.actualIn)} – {formatTime(r.actualOut)}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-xs">{minutesToHoursMinutes(r.workedMinutes)}</td>
                    <td className="px-5 py-3 tabular-nums text-xs">
                      {r.lateMinutes > 0 ? <span className="font-semibold text-red-600">{minutesToHoursMinutes(r.lateMinutes)}</span> : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Manual Log Encoding" subtitle="Fallback when an employee forgets to punch (audit-logged)" />
        <ManualLogForm employees={employees} />
      </Card>
    </>
  );
}
