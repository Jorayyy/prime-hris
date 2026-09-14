"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { deletePayPeriodAction } from "@/lib/actions/payroll";

export default function DeletePeriodButton({
  periodId,
  status,
}: {
  periodId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState(deletePayPeriodAction, {} as { error?: string });
  const formRef = useRef<HTMLFormElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const needsPassword = ["APPROVED", "PAID", "LOCKED"].includes(status);

  return (
    <form ref={formRef} action={action} className="inline">
      <input type="hidden" name="periodId" value={periodId} />
      {needsPassword && showPassword && (
        <input
          type="password"
          name="password"
          placeholder="Enter your password"
          autoFocus
          className="mr-2 w-40 rounded-lg border border-danger/30 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-danger/30"
        />
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (needsPassword && !showPassword) {
            setShowPassword(true);
            return;
          }
          const msg = needsPassword
            ? "Delete this paid period? This will remove all payslips and cannot be undone."
            : "Delete this pay period? This cannot be undone.";
          if (!confirm(msg)) return;
          formRef.current?.requestSubmit();
        }}
        className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/5 transition-colors disabled:opacity-50"
        title="Delete this period"
      >
        <Trash2 className="h-3.5 w-3.5" /> {pending ? "Deleting…" : "Delete"}
      </button>
      {state.error && (
        <p className="mt-1 text-xs text-danger">{state.error}</p>
      )}
    </form>
  );
}
