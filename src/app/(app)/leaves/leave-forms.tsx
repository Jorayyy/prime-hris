"use client";

import { useActionState } from "react";
import { fileLeaveAction } from "@/lib/actions/leaves";

export default function LeaveForms({
  leaveTypes,
}: {
  leaveTypes: Array<{ id: string; name: string }>;
}) {
  const [state, formAction, pending] = useActionState(fileLeaveAction, {} as { error?: string });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-3 px-5 py-4">
      <div>
        <label className="label">Leave Type</label>
        <select name="leaveTypeId" className="field" required>
          {leaveTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">From</label>
          <input type="date" name="startDate" min={today} defaultValue={today} className="field" required />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" name="endDate" min={today} defaultValue={today} className="field" required />
        </div>
      </div>
      <div>
        <label className="label">Reason</label>
        <textarea name="reason" rows={3} required minLength={3} className="field" placeholder="Brief reason for the request…" />
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      ) : null}

      <button
        disabled={pending}
        className="w-full rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-strong)] disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit Request"}
      </button>
    </form>
  );
}
