"use client";

import { useActionState, useState } from "react";
import { addManualLogAction } from "@/lib/actions/attendance";

export default function ManualLogForm({
  employees,
}: {
  employees: Array<{ id: string; firstName: string; lastName: string; employeeNumber: string }>;
}) {
  const [state, formAction, pending] = useActionState(addManualLogAction, {} as { error?: string });
  const [key, setKey] = useState(0);

  return (
    <form
      key={key}
      action={async (fd) => {
        formAction(fd);
        setKey((k) => k + 1);
      }}
      className="grid gap-4 p-5 sm:grid-cols-4"
    >
      <div>
        <label className="label">Employee</label>
        <select name="employeeId" className="field" required>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.lastName}, {e.firstName} ({e.employeeNumber})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Punch Type</label>
        <select name="type" className="field" required>
          <option value="CLOCK_IN">Clock In</option>
          <option value="CLOCK_OUT">Clock Out</option>
        </select>
      </div>
      <div>
        <label className="label">Date &amp; Time</label>
        <input type="datetime-local" name="timestamp" className="field" required />
      </div>
      <div className="flex items-end">
        <button
          disabled={pending}
          className="w-full rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--brand-strong)] disabled:opacity-50"
        >
          {pending ? "Saving…" : "Add Log"}
        </button>
      </div>
      {state.error ? (
        <p className="sm:col-span-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
      ) : null}
    </form>
  );
}
