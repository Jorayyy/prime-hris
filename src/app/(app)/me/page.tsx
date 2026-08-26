import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { Card, CardHeader, Badge, statusTone, EmptyState } from "@/components/ui";
import { formatCurrency, formatDate, formatDateOnly, formatTime, minutesToHoursMinutes, fullName } from "@/lib/format";

export const metadata = { title: "My Space" };

async function loadMySpaceData(employeeId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [dtr, payslips, ytdAgg, balances] = await Promise.all([
    db.attendanceDaily.findMany({
      where: { employeeId, workDate: { gte: monthStart, lt: nextMonth } },
      orderBy: { workDate: "desc" },
    }),
    db.payslip.findMany({
      where: { employeeId, payPeriod: { status: { in: ["APPROVED", "PAID"] } } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { payPeriod: true },
    }),
    db.payslip.aggregate({
      where: {
        employeeId,
        payPeriod: { status: { in: ["APPROVED", "PAID"] }, startDate: { gte: yearStart } },
      },
      _sum: { grossPay: true, netPay: true, basicPay: true },
    }),
    db.leaveBalance.findMany({
      where: { employeeId, year: now.getFullYear() },
      include: { leaveType: true },
      orderBy: { leaveType: { code: "asc" } },
    }),
  ]);

  return { dtr, payslips, ytdAgg, balances, now };
}

export default async function MySpacePage() {
  const user = await getSessionUser();
  if (!user) {
    return <EmptyState title="Not authenticated" hint="Please log in to view your space." />;
  }
  if (!user.employeeId) {
    return (
      <EmptyState
        title="No employee record linked"
        hint="This account is administrative only. Link it to an employee record to see personal data."
      />
    );
  }

  const me = await db.employee.findUnique({
    where: { id: user.employeeId },
    include: {
      position: true,
      campaign: true,
      site: true,
      department: true,
    },
  });
  if (!me) return <EmptyState title="Employee record not found" />;

  let spaceData;
  try {
    spaceData = await loadMySpaceData(user.employeeId);
  } catch (err) {
    console.error("Failed to load My Space data:", err);
    spaceData = { dtr: [], payslips: [], ytdAgg: { _sum: { grossPay: null, netPay: null, basicPay: null } }, balances: [], now: new Date() };
  }

  const { dtr, payslips, ytdAgg, balances, now } = spaceData;

  const totals = dtr.reduce(
    (acc, r) => ({
      worked: acc.worked + r.workedMinutes,
      late: acc.late + r.lateMinutes,
      days: acc.days + (["PRESENT", "LATE"].includes(r.status) ? 1 : 0),
    }),
    { worked: 0, late: 0, days: 0 },
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700">
            {fullName(me).split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{fullName(me)}</h1>
            <p className="text-sm text-[var(--muted)]">
              {me.employeeNumber} · {me.position?.title ?? "—"} {me.campaign ? `· ${me.campaign.name}` : ""} {me.site ? `· ${me.site.name}` : ""}
            </p>
            <div className="mt-1 flex gap-2">
              <Badge tone={statusTone(me.status)}>{me.status.replace(/_/g, " ")}</Badge>
              <Badge tone={me.employmentType === "REGULAR" ? "green" : "amber"}>{me.employmentType}</Badge>
            </div>
          </div>
        </div>
        <Link href="/leaves" className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-strong)]">
          File Leave
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          ["Days Present (this month)", String(totals.days)],
          ["Hours Worked", minutesToHoursMinutes(totals.worked)],
          ["Late Time", minutesToHoursMinutes(totals.late)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[var(--border)] bg-white p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="My DTR This Month" />
          {dtr.length === 0 ? (
            <EmptyState title="No records yet" hint="Your punches will appear here." />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-[var(--border)] text-left text-xs uppercase text-[var(--muted)]">
                    <th className="px-5 py-2.5 font-semibold">Date</th>
                    <th className="px-5 py-2.5 font-semibold">In / Out</th>
                    <th className="px-5 py-2.5 font-semibold">Worked</th>
                    <th className="px-5 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {dtr.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-2.5 tabular-nums">{formatDateOnly(r.workDate)}</td>
                      <td className="px-5 py-2.5 tabular-nums text-xs">
                        {formatTime(r.actualIn)} – {formatTime(r.actualOut)}
                      </td>
                      <td className="px-5 py-2.5 tabular-nums text-xs">{minutesToHoursMinutes(r.workedMinutes)}</td>
                      <td className="px-5 py-2.5">
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
          <CardHeader
            title="My Payslips"
            subtitle={`YTD: ${formatCurrency(ytdAgg._sum.grossPay)} gross · ${formatCurrency(ytdAgg._sum.netPay)} net`}
          />
          {payslips.length === 0 ? (
            <EmptyState title="No payslips yet" hint="Released payslips appear here after payroll approval." />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {payslips.map((ps) => (
                <li key={ps.id}>
                  <Link href={`/payroll/payslip/${ps.id}`} className="flex items-center justify-between px-5 py-3 transition hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-semibold">
                        {formatDate(ps.payPeriod.startDate)} – {formatDate(ps.payPeriod.endDate)}
                      </p>
                      <p className="text-xs text-[var(--muted)]">{Number(ps.daysWorked)}d · basic {formatCurrency(ps.basicPay)}</p>
                    </div>
                    <span className="text-sm font-bold tabular-nums">{formatCurrency(ps.netPay)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="My Leave Credits" subtitle={`As of ${formatDateOnly(now)} · ${now.getFullYear()}`} />
        {balances.length === 0 ? (
          <EmptyState title="No credits yet" hint="Leave credits appear once HR configures them for you." />
        ) : (
          <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-4 lg:grid-cols-6">
            {balances.map((b) => {
              const total = Number(b.entitlement) + Number(b.carriedOver);
              const remaining = total - Number(b.used) - Number(b.pending);
              return (
                <div key={b.id} className="rounded-xl border border-[var(--border)] p-3 text-center">
                  <p className="text-xs font-bold text-[var(--muted)]">{b.leaveType.code}</p>
                  <p className="text-xl font-bold tabular-nums">{remaining}</p>
                  <p className="text-[10px] text-[var(--muted)]">
                    of {total}
                    {Number(b.pending) > 0 ? ` · ${Number(b.pending)} pending` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader title="My Government Numbers" />
        <div className="grid gap-x-8 gap-y-2 px-5 py-4 sm:grid-cols-4 text-sm">
          {[
            ["SSS", me.sssNumber],
            ["PhilHealth", me.philhealthNumber],
            ["Pag-IBIG", me.pagibigNumber],
            ["TIN", me.tinNumber],
          ].map(([label, v]) => (
            <div key={String(label)}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">{label}</p>
              <p className="font-mono">{v ?? "Not on file — contact HR"}</p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
