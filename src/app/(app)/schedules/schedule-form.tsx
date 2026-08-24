"use client";

import { useActionState, useState } from "react";
import { assignScheduleAction } from "@/lib/actions/attendance";

export default function ScheduleForm({
  templates,
  employees,
  defaultStart,
  defaultEnd,
}: {
  templates: Array<{ id: string; name: string }>;
  employees: Array<{ id: string; firstName: string; lastName: string; employeeNumber: string; campaign?: { name: string } | null }>;
  defaultStart: string;
  defaultEnd: string;
}) {
  const [state, formAction, pending] = useActionState(
    assignScheduleAction,
    {} as { error?: string; ok?: boolean; count?: number },
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const filtered = employees.filter((e) =>
    query
      ? `${e.lastName} ${e.firstName} ${e.employeeNumber}`.toLowerCase().includes(query.toLowerCase())
      : true,
  );

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((e) => selected.has(e.id));

  return (
    <form action={formAction} className="grid gap-6 p-5 lg:grid-cols-2">
      <div>
        <label className="label">Select Employees ({selected.size})</label>
        <input
          className="field mb-2"
          placeholder="Filter by name or number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] p-2">
          <label className="flex items-center gap-2 rounded px-2 py-1 text-xs font-semibold text-slate-500">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={() => {
                if (allFilteredSelected) {
                  setSelected(new Set());
                } else {
                  setSelected(new Set(filtered.map((e) => e.id)));
                }
              }}
            />
            Select all shown ({filtered.length})
          </label>
          {filtered.map((e) => (
            <label key={e.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
              <input type="checkbox" name="employeeIds" value={e.id} checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
              <span>
                {e.lastName}, {e.firstName}
                <span className="text-xs text-[var(--muted)]"> · {e.employeeNumber}{e.campaign ? ` · ${e.campaign.name}` : ""}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">Shift Template</label>
          <select name="shiftTemplateId" className="field" defaultValue="">
            <option value="">— None (custom / rest day) —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">From</label>
            <input type="date" name="startDate" defaultValue={defaultStart} className="field" required />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" name="endDate" defaultValue={defaultEnd} className="field" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Custom Start (optional)</label>
            <input type="time" name="customStart" className="field" />
          </div>
          <div>
            <label className="label">Custom End (optional)</label>
            <input type="time" name="customEnd" className="field" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="isRestDay" /> Mark as rest day
        </label>

        {state.error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{state.error}</p>
        ) : null}
        {state.ok ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            {state.count} assignment{state.count === 1 ? "" : "s"} saved.
          </p>
        ) : null}

        <button
          disabled={pending || selected.size === 0}
          className="w-full rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--brand-strong)] disabled:opacity-50"
        >
          {pending ? "Saving…" : `Assign Schedule (${selected.size} employees)`}
        </button>
      </div>
    </form>
  );
}
