"use client";

import { useActionState } from "react";
import { Archive } from "lucide-react";
import { archivePayPeriodAction } from "@/lib/actions/payroll";

export default function ArchiveButton({ periodId }: { periodId: string }) {
  const [state, action, pending] = useActionState(archivePayPeriodAction.bind(null, periodId), {} as { error?: string });

  return (
    <form action={action} className="inline">
      <button
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-[var(--muted)] hover:bg-surface-hover transition-colors disabled:opacity-50"
        title="Archive this period"
      >
        <Archive className="h-3.5 w-3.5" /> {pending ? "Archiving…" : "Archive"}
      </button>
      {state.error && <span className="ml-2 text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
