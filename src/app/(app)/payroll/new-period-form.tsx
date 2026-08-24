"use client";

import { useActionState } from "react";
import { createPayPeriodAction } from "@/lib/actions/payroll";

export default function NewPayPeriodForm() {
  const [state, formAction, pending] = useActionState(createPayPeriodAction, {} as { error?: string });

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const midMonth = new Date(today.getFullYear(), today.getMonth(), 15).toISOString().slice(0, 10);

  return (
    <form action={formAction} className="grid gap-4 p-5 sm:grid-cols-4">
      <div>
        <label className="label">Period Start</label>
        <input type="date" name="startDate" defaultValue={monthStart} className="field" required />
      </div>
      <div>
        <label className="label">Period End</label>
        <input type="date" name="endDate" defaultValue={midMonth} className="field" required />
      </div>
      <div>
        <label className="label">Pay Date</label>
        <input type="date" name="payDate" className="field" required />
      </div>
      <div className="flex items-end">
        <button
          disabled={pending}
          className="w-full rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-strong)] disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create Period"}
        </button>
      </div>
      {state.error ? (
        <p className="sm:col-span-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      ) : null}
    </form>
  );
}
