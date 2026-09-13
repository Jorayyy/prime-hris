"use client";

import { useState } from "react";
import { AlertTriangle, Eye, Play, Loader2, ChevronDown, ChevronUp } from "lucide-react";
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
  exceptions: Array<{ type: string; severity: string; message: string }>;
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
  groupName,
  onProcess,
}: {
  periodId: string;
  siteId: string;
  groupId: string;
  groupName: string;
  onProcess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function loadPreview() {
    setLoading(true);
    try {
      const result = await previewPayrollAction(periodId, siteId, groupId);
      setRows(result.rows);
      setExceptions(result.exceptions);
      setLoaded(true);
    } catch {
      setRows([]);
      setExceptions([]);
      setLoaded(true);
    }
    setLoading(false);
  }

  const totals = rows.reduce(
    (acc, r) => ({
      gross: acc.gross + r.grossPay,
      deductions: acc.deductions + r.totalDeductions,
      net: acc.net + r.netPay,
      basic: acc.basic + r.basicPay,
      nd: acc.nd + r.nightDiffPay,
      ot: acc.ot + r.overtimePay,
      holiday: acc.holiday + r.holidayPay,
    }),
    { gross: 0, deductions: 0, net: 0, basic: 0, nd: 0, ot: 0, holiday: 0 },
  );

  const errorCount = exceptions.filter((e) => e.severity === "ERROR").length;
  const warnCount = exceptions.filter((e) => e.severity === "WARNING").length;

  if (!loaded && !loading) {
    return (
      <button
        onClick={loadPreview}
        className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-hover transition-colors"
      >
        <Eye className="h-4 w-4" /> Preview {groupName}
      </button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading preview...
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold">Preview — {groupName}</h3>
          {exceptions.length > 0 && (
            <span className="flex items-center gap-1 text-xs">
              {errorCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700">
                  <AlertTriangle className="h-3 w-3" /> {errorCount} error{errorCount > 1 ? "s" : ""}
                </span>
              )}
              {warnCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                  {warnCount} warning{warnCount > 1 ? "s" : ""}
                </span>
              )}
            </span>
          )}
        </div>
        <button
          onClick={onProcess}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-dark transition-colors"
        >
          <Play className="h-3 w-3" /> Process
        </button>
      </div>

      {exceptions.length > 0 && (
        <div className="border-b border-border bg-amber-50/50 px-4 py-3">
          <p className="mb-2 text-xs font-bold text-amber-800">Exceptions</p>
          <div className="space-y-1">
            {exceptions.map((ex, i) => (
              <p key={i} className="text-xs text-amber-700">
                <span className="font-semibold">{rows.find((r) => r.employeeId === ex.employeeId)?.employeeName ?? "Unknown"}</span>
                {" — "}
                {ex.message}
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
              <th className="px-3 py-2 font-semibold text-right">Days</th>
              <th className="px-3 py-2 font-semibold text-right">Basic</th>
              <th className="px-3 py-2 font-semibold text-right">ND</th>
              <th className="px-3 py-2 font-semibold text-right">OT</th>
              <th className="px-3 py-2 font-semibold text-right">Holiday</th>
              <th className="px-3 py-2 font-semibold text-right">Gross</th>
              <th className="px-3 py-2 font-semibold text-right">Deductions</th>
              <th className="px-3 py-2 font-semibold text-right">Net Pay</th>
              <th className="px-3 py-2 font-semibold text-center">Issues</th>
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
                          <span>Undertime: {r.lateUndertimeDeduction > 0 ? "Yes" : "No"}</span>
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
