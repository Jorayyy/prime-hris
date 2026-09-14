"use client";

import { useRef } from "react";
import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { deletePayPeriodAction } from "@/lib/actions/payroll";

export default function DeletePeriodButton({ periodId }: { periodId: string }) {
  const [state, action, pending] = useActionState(deletePayPeriodAction.bind(null, periodId), {} as { error?: string });
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={action}
      className="inline"
    >
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this pay period? This cannot be undone.")) {
            formRef.current?.requestSubmit();
          }
        }}
        className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/5 transition-colors disabled:opacity-50"
        title="Delete this period"
      >
        <Trash2 className="h-3.5 w-3.5" /> {pending ? "Deleting…" : "Delete"}
      </button>
      {state.error && <span className="ml-2 text-xs text-danger">{state.error}</span>}
    </form>
  );
}
