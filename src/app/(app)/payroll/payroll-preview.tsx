"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { previewPayrollAction } from "@/lib/actions/payroll";
import { formatCurrency } from "@/lib/format";

type PreviewRow = {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  monthlyRate: number;
  daysWorked: number;
  absentDays: number;
  paidLeaveDays: number;
  lateMinutes: number;
  undertimeMinutes: number;
  nightDiffMinutes: number;
  otHours: number;
  basicPay: number;
  nightDiffPay: number;
  overtimePay: number;
  holidayPay: number;
  absenceDeduction: number;
  lateUndertimeDeduction: number;
  grossPay: number;
  sss: number;
  philhealth: number;
  pagibig: number;
  withholdingTax: number;
  totalDeductions: number;
  netPay: number;
  exceptions: { type: string; severity: string; message: string }[];
};

type ExceptionRow = {
  employeeId: string;
  type: string;
  severity: string;
  message: string;
};

export default function PayrollPreview({
  periodId,
  siteId,
  groupId,
}: {
  periodId: string;
  siteId: string;
  groupId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoaded(false);
    setRows([]);
    setExceptions([]);

    previewPayrollAction(periodId, siteId, groupId).then((result) => {
      if (cancelled) return;
      setRows(result.rows);
      setExceptions(result.exceptions);
      setLoaded(true);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [periodId, siteId, groupId]);

  const totals = rows.reduce(
    (acc, r) => ({
      basic: acc.basic + r.basicPay,
      nd: acc.nd + r.nightDiffPay,
      ot: acc.ot + r.overtimePay,
      holiday: acc.holiday + r.holidayPay,
      gross: acc.gross + r.grossPay,
      deductions: acc.deductions + r.totalDeductions,
      net: acc.net + r.netPay,
    }),
    { basic: 0, nd: 0, ot: 0, holiday: 0, gross: 0, deductions: 0, net: 0 },
  );

  const errorCount = exceptions.filter((e) => e.severity === "ERROR").length;
  const warnCount = exceptions.filter((e) => e.severity === "WARNING").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-slate-50 px-4 py-6 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Calculating payslips...
      </div>
    );
  }

  if (!loaded) return null;

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      {exceptions.length > 0 && (
        <div className="border-b border-border bg-amber-50/50 px-4 py-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-amber-800">
            <span>Exceptions</span>
            {errorCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                <AlertTriangle className="h-3 w-3" /> {errorCount}
              </span>
            )}
            {warnCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                {warnCount}
              </span>
            )}
          </div>
          <div className="max-h-24 space-y-0.5 overflow-y-auto text-xs text-amber-700">
            {exceptions.map((ex, i) => (
              <p key={i}>
                <span className="font-semibold">{rows.find((r) => r.employeeId === ex.employeeId)?.employeeName ?? "?"}</span>
                {" — "}{ex.message}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-slate-50 text-left uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-semibold">Employee</th>
              <th className="px-3 py-2 text-right font-semibold">Days</th>
              <th className="px-3 py-2 text-right font-semibold">Basic</th>
              <th className="px-3 py-2 text-right font-semibold">ND</th>
              <th className="px-3 py-2 text-right font-semibold">OT</th>
              <th className="px-3 py-2 text-right font-semibold">Holiday</th>
              <th className="px-3 py-2 text-right font-semibold">Gross</th>
              <th className="px-3 py-2 text-right font-semibold">Deductions</th>
              <th className="px-3 py-2 text-right font-semibold">Net Pay</th>
              <th className="px-3 py-2 text-center font-semibold">Issues</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const isExpanded = expanded === r.employeeId;
              return (
                <>
                  <tr
                    key={r.employeeId}
                    className={`transition hover:bg-slate-50 cursor-pointer ${r.exceptions.length > 0 ? "bg-amber-50/30" : ""}`}
                    onClick={() => setExpanded(isExpanded ? null : r.employeeId)}
                  >
                    <td className="px-3 py-2">
                      <span className="font-semibold">{r.employeeName}</span>
                      <span className="ml-1 text-muted">{r.employeeNumber}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.daysWorked}d</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.basicPay)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.nightDiffPay)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.overtimePay)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(r.holidayPay)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatCurrency(r.grossPay)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-600">-{formatCurrency(r.totalDeductions)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">{formatCurrency(r.netPay)}</td>
                    <td className="px-3 py-2 text-center">
                      {r.exceptions.length > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                          <span className="font-semibold text-amber-700">{r.exceptions.length}</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3 text-muted" /> : <ChevronDown className="h-3 w-3 text-muted" />}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && r.exceptions.length > 0 && (
                    <tr key={`${r.employeeId}-detail`}>
                      <td colSpan={10} className="bg-amber-50/50 px-6 py-2">
                        {r.exceptions.map((ex, j) => (
                          <p key={j} className="text-xs text-amber-700">
                            <span className={`font-bold ${ex.severity === "ERROR" ? "text-red-600" : "text-amber-600"}`}>
                              {ex.severity === "ERROR" ? "ERROR" : "WARN"}
                            </span>{" "}
                            {ex.message}
                          </p>
                        ))}
                        <div className="mt-1 grid grid-cols-4 gap-2 text-[10px] text-muted">
                          <span>Absent: {r.absentDays}d</span>
                          <span>Late: {r.lateMinutes}min</span>
                          <span>Undertime: {r.undertimeMinutes}min</span>
                          <span>ND: {r.nightDiffMinutes}min</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-slate-50 font-bold">
              <td className="px-3 py-2" colSpan={2}>{rows.length} employee(s)</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(totals.basic)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(totals.nd)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(totals.ot)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(totals.holiday)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(totals.gross)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-red-600">-{formatCurrency(totals.deductions)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(totals.net)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
