import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, PAYROLL_ROLES } from "@/lib/auth";
import { formatCurrency, formatDate, fullName } from "@/lib/format";
import PrintButton from "./print-button";

export const metadata = { title: "Payslip" };

function Line({ label, value, bold, negative }: { label: string; value: string; bold?: boolean; negative?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-slate-100 py-1.5 text-sm ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span className={`tabular-nums ${negative ? "text-red-600" : ""}`}>
        {negative ? "-" : ""}
        {value}
      </span>
    </div>
  );
}

export default async function PayslipPage({ params }: { params: Promise<{ id: string }> }) {
  const user = (await getSessionUser())!;
  const { id } = await params;

  const payslip = await db.payslip.findUnique({
    where: { id },
    include: {
      employee: { include: { position: true } },
      payPeriod: true,
      adjustments: true,
    },
  });
  if (!payslip) notFound();

  const isOwner = user.employeeId === payslip.employeeId;
  if (!isOwner && !PAYROLL_ROLES.includes(user.role)) notFound();

  const e = payslip.employee;
  const pp = payslip.payPeriod;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold">{fullName(e)} · Payslip</div>
        <PrintButton />
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-8 print:border-0 print:shadow-none">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between border-b-2 border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-extrabold uppercase tracking-tight">Payslip</h2>
            <p className="text-xs text-slate-500">
              Pay period: {formatDate(pp.startDate)} – {formatDate(pp.endDate)} · Paid {formatDate(pp.payDate)}
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">{e.firstName} {e.lastName}</p>
            <p className="text-slate-500">{e.employeeNumber} · {e.position?.title ?? ""}</p>
          </div>
        </div>

        {/* Rates */}
        <div className="mb-6 grid grid-cols-3 gap-4 rounded-lg bg-slate-50 p-4 text-center text-xs">
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500">Monthly Rate</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">{formatCurrency(payslip.monthlyRate)}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500">Daily Rate</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">{formatCurrency(payslip.dailyRate)}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-slate-500">Days Worked</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">{Number(payslip.daysWorked)}</p>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          {/* Earnings */}
          <section>
            <h3 className="mb-1 text-xs font-extrabold uppercase tracking-widest text-emerald-700">Earnings</h3>
            <Line label="Basic Pay" value={formatCurrency(payslip.basicPay)} />
            {Number(payslip.nightDiffPay) > 0 ? <Line label="Night Differential" value={formatCurrency(payslip.nightDiffPay)} /> : null}
            {Number(payslip.overtimePay) > 0 ? <Line label="Overtime" value={formatCurrency(payslip.overtimePay)} /> : null}
            {Number(payslip.holidayPay) > 0 ? <Line label="Holiday Premiums" value={formatCurrency(payslip.holidayPay)} /> : null}
            {payslip.adjustments.filter((a) => a.type === "EARNING").map((a) => (
              <Line key={a.id} label={a.label} value={formatCurrency(a.amount)} />
            ))}
            <Line label="Gross Earnings" value={formatCurrency(Number(payslip.grossPay))} bold />
          </section>

          {/* Deductions */}
          <section>
            <h3 className="mb-1 text-xs font-extrabold uppercase tracking-widest text-red-700">Deductions</h3>
            {Number(payslip.lateAbsenceDeduction) > 0 ? <Line label="Late / Undertime" value={formatCurrency(payslip.lateAbsenceDeduction)} negative /> : null}
            <Line label="SSS Contribution" value={formatCurrency(payslip.sssContribution)} negative />
            <Line label="PhilHealth Contribution" value={formatCurrency(payslip.philhealthContribution)} negative />
            <Line label="Pag-IBIG Contribution" value={formatCurrency(payslip.pagibigContribution)} negative />
            <Line label="Withholding Tax" value={formatCurrency(payslip.withholdingTax)} negative />
            {payslip.adjustments.filter((a) => a.type === "DEDUCTION").map((a) => (
              <Line key={a.id} label={a.label} value={formatCurrency(a.amount)} negative />
            ))}
            <Line label="Total Deductions" value={formatCurrency(Number(payslip.totalDeductions))} bold negative />
          </section>
        </div>

        {/* Net pay */}
        <div className="mt-6 flex items-center justify-between rounded-lg bg-slate-900 px-5 py-4 text-white">
          <span className="text-sm font-bold uppercase tracking-widest">Net Pay</span>
          <span className="text-2xl font-extrabold tabular-nums">{formatCurrency(Number(payslip.netPay))}</span>
        </div>

        <p className="mt-4 text-right text-[11px] text-slate-400">
          13th month accrued YTD: {formatCurrency(payslip.thirteenthMonthYTD)}
        </p>

        <p className="mt-8 border-t border-slate-100 pt-3 text-center text-[10px] text-slate-400">
          This is a system-generated payslip and does not require a signature.
        </p>
      </div>
    </div>
  );
}
