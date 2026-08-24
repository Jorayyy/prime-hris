"use client";

import { useActionState, useState } from "react";
import { updateShiftTemplateAction, deleteShiftTemplateAction } from "@/lib/actions/settings";

type ShiftTemplate = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  graceMinutes: number;
  color: string;
  isNightShift: boolean;
  _count: { assignments: number };
};

export default function ShiftTemplateEditor({ templates }: { templates: ShiftTemplate[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(updateShiftTemplateAction, {} as { error?: string; ok?: boolean });
  const [deleteState, setDeleteState] = useState<{ error?: string; ok?: boolean }>({});

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this template?")) return;
    const result = await deleteShiftTemplateAction(id);
    setDeleteState(result);
  }

  return (
    <ul className="divide-y divide-[var(--border)] border-t border-[var(--border)] text-sm">
      {templates.map((t) => (
        <li key={t.id} className="px-5 py-3">
          {editing === t.id ? (
            <form action={async (fd) => {
              fd.set("id", t.id);
              formAction(fd);
              setTimeout(() => setEditing(null), 500);
            }} className="space-y-3">
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-500">Name</label>
                  <input name="name" defaultValue={t.name} required className="field w-full" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Start</label>
                  <input name="startTime" type="time" defaultValue={t.startTime} required className="field w-auto" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">End</label>
                  <input name="endTime" type="time" defaultValue={t.endTime} required className="field w-auto" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Break (min)</label>
                  <input name="breakMinutes" type="number" min={0} max={180} defaultValue={t.breakMinutes} className="field w-20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Grace (min)</label>
                  <input name="graceMinutes" type="number" min={0} max={60} defaultValue={t.graceMinutes} className="field w-20" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500">Color</label>
                  <input name="color" type="color" defaultValue={t.color} className="field h-9 w-12 p-1" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button disabled={pending} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50">
                  {pending ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                {state.ok && editing === t.id ? <span className="text-xs text-emerald-600">Saved.</span> : null}
                {state.error && editing === t.id ? <span className="text-xs text-red-600">{state.error}</span> : null}
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                <div>
                  <span className="font-semibold">{t.name}</span>
                  <span className="ml-2 font-mono text-xs text-[var(--muted)]">
                    {t.startTime} → {t.endTime} · break {t.breakMinutes}m · grace {t.graceMinutes}m
                  </span>
                  {t.isNightShift ? (
                    <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">Night</span>
                  ) : null}
                  <span className="ml-2 text-xs text-[var(--muted)]">({t._count.assignments} assignments)</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditing(t.id)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Edit">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => handleDelete(t.id)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
      {deleteState.error ? <li className="px-5 py-2 text-xs text-red-600">{deleteState.error}</li> : null}
    </ul>
  );
}
