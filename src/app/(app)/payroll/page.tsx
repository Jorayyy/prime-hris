import Link from "next/link";
import { db } from "@/lib/db";
import { getSessionUser, PAYROLL_ROLES } from "@/lib/auth";
import { Card, CardHeader, Badge, statusTone, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";
import NewPayPeriodForm from "./new-period-form";

export const metadata = { title: "Payroll" };

export default async function PayrollPage() {
  const user = (await getSessionUser())!;
  if (!PAYROLL_ROLES.includes(user.role)) {
    return <EmptyState title="Not authorized" hint="Payroll is restricted to payroll officers and admins." />;
  }

  const periods = await db.payPeriod.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { payslips: true } },
    },
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Payroll</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Philippine payroll runs with SSS, PhilHealth, Pag-IBIG, BIR withholding tax, night differential,
          holiday premiums, and 13th month tracking.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader title="New Pay Period" subtitle="Define the cut-off and payout date" />
        <NewPayPeriodForm />
      </Card>

      <Card>
        <CardHeader title="Pay Periods" subtitle={`${periods.length} period${periods.length === 1 ? "" : "s"}`} />
        {periods.length === 0 ? (
          <EmptyState title="No pay periods yet" hint="Create your first pay period above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-5 py-3 font-semibold">Period</th>
                  <th className="px-5 py-3 font-semibold">Pay Date</th>
                  <th className="px-5 py-3 font-semibold">Frequency</th>
                  <th className="px-5 py-3 font-semibold">Payslips</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {periods.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold">
                      <Link href={`/payroll/${p.id}`} className="hover:text-[var(--brand)]">
                        {formatDate(p.startDate)} – {formatDate(p.endDate)}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{formatDate(p.payDate)}</td>
                    <td className="px-5 py-3">{p.frequency.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3 tabular-nums">{p._count.payslips}</td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(p.status)}>{p.status.replace(/_/g, " ")}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
