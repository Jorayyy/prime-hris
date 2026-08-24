"use client";

import { useActionState } from "react";
import { PlayCircle, CheckCircle2, Banknote } from "lucide-react";
import { processPayrollAction, approvePayrollAction, markPaidAction } from "@/lib/actions/payroll";

export default function PeriodActions({ periodId, status }: { periodId: string; status: string }) {
  const [processState, processAction, processing] = useActionState(processPayrollAction, {} as { error?: string });
  const [approveState, approveAction, approving] = useActionState(approvePayrollAction, {} as { error?: string });
  const [paidState, paidAction, paying] = useActionState(markPaidAction, {} as { error?: string });

  const err = processState.error ?? approveState.error ?? paidState.error;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {["DRAFT", "PROCESSING"].includes(status) ? (
        <form action={processAction} className="inline">
          <input type="hidden" name="periodId" value={periodId} />
          <button
            disabled={processing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-bold text-white hover:bg-[var(--brand-strong)] disabled:opacity-50"
          >
            <PlayCircle className="h-3.5 w-3.5" /> {processing ? "Processing…" : "Process Payroll"}
          </button>
        </form>
      ) : null}

      {status === "FOR_APPROVAL" ? (
        <form action={approveAction} className="inline">
          <input type="hidden" name="periodId" value={periodId} />
          <button
            disabled={approving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Approve (Admin)
          </button>
        </form>
      ) : null}

      {status === "APPROVED" ? (
        <form action={paidAction} className="inline">
          <input type="hidden" name="periodId" value={periodId} />
          <button
            disabled={paying}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50"
          >
            <Banknote className="h-3.5 w-3.5" /> Mark as Paid
          </button>
        </form>
      ) : null}

      {err ? <span className="text-xs font-medium text-red-600">{err}</span> : null}
    </div>
  );
}
