"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";
import { decideLeaveAction } from "@/lib/actions/leaves";

export default function LeaveDecisionForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(decideLeaveAction, {} as { error?: string });

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <button
        name="decision"
        value="APPROVED"
        disabled={pending}
        title="Approve"
        className="rounded-lg bg-emerald-600 p-2 text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        name="decision"
        value="REJECTED"
        disabled={pending}
        title="Reject"
        className="rounded-lg bg-red-600 p-2 text-white transition hover:bg-red-700 disabled:opacity-50"
      >
        <X className="h-4 w-4" />
      </button>
      {state.error ? <span className="text-xs text-red-600">{state.error}</span> : null}
    </form>
  );
}
