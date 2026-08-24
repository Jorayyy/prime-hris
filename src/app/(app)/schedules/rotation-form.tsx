"use client";

import { useActionState, useState } from "react";
import { assignRotationScheduleAction } from "@/lib/actions/attendance";

type ShiftTemplate = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  campaign?: { name: string } | null;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function RotationScheduleForm({
  templates,
  employees,
  defaultStart,
  defaultEnd,
}: {
  templates: ShiftTemplate[];
  employees: Employee[];
  defaultStart: string;
  defaultEnd: string;
}) {
  const [state, formAction, pending] = useActionState(
    assignRotationScheduleAction,
    {} as { error?: string; ok?: boolean; count?: number },
  );

  const [patternType, setPatternType] = useState<"WEEKLY" | "CUSTOM">("WEEKLY");
  const [weeklyPattern, setWeeklyPattern] = useState<Record<number, string>>({});
  const [customPattern, setCustomPattern] = useState<string[]>([]);
  const [customCycleLength, setCustomCycleLength] = useState(7);
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

  function setWeeklyDay(day: number, templateId: string) {
    setWeeklyPattern((prev) => ({ ...prev, [day]: templateId }));
  }

  function addCustomDay() {
    setCustomPattern((prev) => [...prev, "REST"]);
  }

  function setCustomDay(index: number, templateId: string) {
    setCustomPattern((prev) => {
      const next = [...prev];
      next[index] = templateId;
      return next;
    });
  }

  function removeCustomDay(index: number) {
    setCustomPattern((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form
      action={(fd) => {
        fd.set("patternType", patternType);
        if (patternType === "WEEKLY") {
          fd.set("weeklyPattern", JSON.stringify(weeklyPattern));
        } else {
          fd.set("customPattern", JSON.stringify(customPattern));
          fd.set("customCycleLength", String(customCycleLength));
        }
        formAction(fd);
      }}
      className="grid gap-6 p-5 lg:grid-cols-2"
    >
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
              checked={filtered.length > 0 && filtered.every((e) => selected.has(e.id))}
              onChange={() => {
                if (filtered.every((e) => selected.has(e.id))) {
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
          <label className="label">Pattern Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPatternType("WEEKLY")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                patternType === "WEEKLY"
                  ? "bg-[var(--brand)] text-white"
                  : "border border-[var(--border)] bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Weekly Rotation
            </button>
            <button
              type="button"
              onClick={() => setPatternType("CUSTOM")}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                patternType === "CUSTOM"
                  ? "bg-[var(--brand)] text-white"
                  : "border border-[var(--border)] bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Custom Cycle
            </button>
          </div>
        </div>

        {patternType === "WEEKLY" ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--muted)]">Assign a shift to each day of the week:</p>
            {DAY_NAMES.map((day, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-24 text-xs font-medium text-slate-600">{day}</span>
                <select
                  value={weeklyPattern[index] ?? "REST"}
                  onChange={(e) => setWeeklyDay(index, e.target.value)}
                  className="field flex-1"
                >
                  <option value="REST">Rest Day</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.startTime}-{t.endTime})</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-[var(--muted)]">Cycle length (days):</p>
              <input
                type="number"
                min={1}
                max={365}
                value={customCycleLength}
                onChange={(e) => setCustomCycleLength(Number(e.target.value))}
                className="field w-20"
              />
            </div>
            <p className="text-xs font-medium text-[var(--muted)]">Define the rotation pattern (repeats every {customCycleLength} days):</p>
            {customPattern.map((templateId, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-20 text-xs font-medium text-slate-600">Day {index + 1}</span>
                <select
                  value={templateId}
                  onChange={(e) => setCustomDay(index, e.target.value)}
                  className="field flex-1"
                >
                  <option value="REST">Rest Day</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.startTime}-{t.endTime})</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeCustomDay(index)}
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addCustomDay}
              className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              + Add Day
            </button>
          </div>
        )}

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
          {pending ? "Saving…" : `Assign Rotation (${selected.size} employees)`}
        </button>
      </div>
    </form>
  );
}
