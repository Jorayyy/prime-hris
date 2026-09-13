"use client";

import { useActionState } from "react";
import { Undo2 } from "lucide-react";
import { unarchivePayPeriodAction } from "@/lib/actions/payroll";

export default function UnarchiveButton({ periodId }: { periodId: string }) {
  const [state, action, pending] = useActionState(unarchivePayPeriodAction.bind(null, periodId), {} as { error?: string });

  return (
    <form action={action} className="inline">
      <button
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50"
        title="Restore to active list"
      >
        <Undo2 className="h-3.5 w-3.5" /> {pending ? "Restoring…" : "Restore"}
      </button>
      {state.error && <span className="ml-2 text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
