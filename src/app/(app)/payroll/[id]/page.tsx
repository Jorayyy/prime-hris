import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { db } from "@/lib/db";
import { getSessionUser, PAYROLL_ROLES } from "@/lib/auth";
import { Card, CardHeader, Badge, statusTone, EmptyState } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import PeriodActions from "../period-actions";

export const metadata = { title: "Pay Period" };

export default async function PayPeriodPage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await getSessionUser())!;
  if (!PAYROLL_ROLES.includes(user.role)) notFound();

  const { id } = await params;

  const period = await db.payPeriod.findUnique({
    where: { id },
    include: {
      payslips: {
        include: { employee: true },
        orderBy: [{ employee: { lastName: "asc" } }],
      },
      _count: { select: { payslips: true } },
    },
  });
  if (!period) notFound();

  const totals = period.payslips.reduce(
    (acc, p) => ({
      gross: acc.gross + Number(p.grossPay),
      deductions: acc.deductions + Number(p.totalDeductions),
      net: acc.net + Number(p.netPay),
      sss: acc.sss + Number(p.sssContribution),
      philhealth: acc.philhealth + Number(p.philhealthContribution),
      pagibig: acc.pagibig + Number(p.pagibigContribution),
      tax: acc.tax + Number(p.withholdingTax),
    }),
    { gross: 0, deductions: 0, net: 0, sss: 0, philhealth: 0, pagibig: 0, tax: 0 },
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/payroll" className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-3 w-3" /> All periods
          </Link>
          <h1 className="text-xl font-bold tracking-tight">
            {formatDate(period.startDate)} – {formatDate(period.endDate)}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]">
            Pay date {formatDate(period.payDate)} · <Badge tone={statusTone(period.status)}>{period.status.replace(/_/g, " ")}</Badge>
          </p>
        </div>
        <PeriodActions periodId={period.id} status={period.status} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Total Gross", formatCurrency(totals.gross)],
          ["Total Deductions", formatCurrency(totals.deductions)],
          ["Net Payout", formatCurrency(totals.net)],
          ["Payslips", String(period._count.payslips)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[var(--border)] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader
          title="Government Contributions Summary"
          subtitle="Employment remittance report for this period (employee shares)"
        />
        <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-5">
          {[
            ["SSS", totals.sss],
            ["PhilHealth", totals.philhealth],
            ["Pag-IBIG", totals.pagibig],
            ["BIR WHT", totals.tax],
            ["Total", totals.sss + totals.philhealth + totals.pagibig + totals.tax],
          ].map(([label, v]) => (
            <div key={String(label)} className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums">{formatCurrency(v as number)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Payslips" subtitle="Click a row to view the printable payslip" />
        {period.payslips.length === 0 ? (
          <EmptyState title="Not processed yet" hint="Run payroll to generate payslips for all active employees." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-5 py-3 font-semibold">Employee</th>
                  <th className="px-5 py-3 font-semibold text-right">Basic</th>
                  <th className="px-5 py-3 font-semibold text-right">NSD</th>
                  <th className="px-5 py-3 font-semibold text-right">OT</th>
                  <th className="px-5 py-3 font-semibold text-right">Holiday</th>
                  <th className="px-5 py-3 font-semibold text-right">Gross</th>
                  <th className="px-5 py-3 font-semibold text-right">Deductions</th>
                  <th className="px-5 py-3 font-semibold text-right">Net Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {period.payslips.map((ps) => (
                  <tr key={ps.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link href={`/payroll/payslip/${ps.id}`} className="font-semibold hover:text-[var(--brand)]">
                        {ps.employee.lastName}, {ps.employee.firstName}
                      </Link>
                      <span className="block text-xs text-[var(--muted)]">{ps.employee.employeeNumber} · {Number(ps.daysWorked)}d worked</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(ps.basicPay)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(ps.nightDiffPay)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(ps.overtimePay)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(ps.holidayPay)}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold">{formatCurrency(ps.grossPay)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-red-600">-{formatCurrency(ps.totalDeductions)}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-bold">{formatCurrency(ps.netPay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
        <Download className="h-3.5 w-3.5" /> CSV export and printable BIR 2316 forms are planned next.
      </p>
    </>
  );
}
