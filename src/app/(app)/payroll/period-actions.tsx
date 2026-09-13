"use client";

import { useActionState } from "react";
import { PlayCircle, CheckCircle2, Banknote, Lock, Unlock } from "lucide-react";
import { processPayrollAction, approvePayrollAction, markPaidAction, lockPayPeriodAction, unlockPayPeriodAction } from "@/lib/actions/payroll";

export default function PeriodActions({ periodId, status }: { periodId: string; status: string }) {
  const [processState, processAction, processing] = useActionState(processPayrollAction, {} as { error?: string });
  const [approveState, approveAction, approving] = useActionState(approvePayrollAction, {} as { error?: string });
  const [paidState, paidAction, paying] = useActionState(markPaidAction, {} as { error?: string });
  const [lockState, lockAction, locking] = useActionState(lockPayPeriodAction.bind(null, periodId), {} as { error?: string });
  const [unlockState, unlockAction, unlocking] = useActionState(unlockPayPeriodAction.bind(null, periodId), {} as { error?: string });

  const err = processState.error ?? approveState.error ?? paidState.error ?? lockState.error ?? unlockState.error;

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
        <>
          <form action={paidAction} className="inline">
            <input type="hidden" name="periodId" value={periodId} />
            <button
              disabled={paying}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50"
            >
              <Banknote className="h-3.5 w-3.5" /> Mark as Paid
            </button>
          </form>
          <form action={lockAction} className="inline">
            <button
              disabled={locking}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            >
              <Lock className="h-3.5 w-3.5" /> {locking ? "Locking…" : "Lock"}
            </button>
          </form>
        </>
      ) : null}

      {status === "PAID" ? (
        <form action={lockAction} className="inline">
          <button
            disabled={locking}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
          >
            <Lock className="h-3.5 w-3.5" /> {locking ? "Locking…" : "Lock"}
          </button>
        </form>
      ) : null}

      {status === "LOCKED" ? (
        <form action={unlockAction} className="inline">
          <button
            disabled={unlocking}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Unlock className="h-3.5 w-3.5" /> {unlocking ? "Unlocking…" : "Unlock"}
          </button>
        </form>
      ) : null}

      {err ? <span className="text-xs font-medium text-red-600">{err}</span> : null}
    </div>
  );
}
