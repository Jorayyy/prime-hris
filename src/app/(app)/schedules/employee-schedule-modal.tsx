"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";

type ShiftTemplate = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
};

type Assignment = {
  id: string;
  date: string;
  shiftTemplate: ShiftTemplate | null;
  customStart: string | null;
  customEnd: string | null;
  isRestDay: boolean;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  campaign?: { name: string } | null;
};

export default function EmployeeScheduleModal({
  employee,
  assignments,
  onClose,
  onDelete,
}: {
  employee: Employee;
  assignments: Assignment[];
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [sortedAssignments, setSortedAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    const sorted = [...assignments].sort((a, b) => a.date.localeCompare(b.date));
    setSortedAssignments(sorted);
  }, [assignments]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-sm font-bold">{employee.lastName}, {employee.firstName}</h2>
            <p className="text-xs text-[var(--muted)]">
              {employee.employeeNumber}{employee.campaign ? ` · ${employee.campaign.name}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {sortedAssignments.length === 0 ? (
            <p className="text-center text-sm text-[var(--muted)]">No schedule assignments found.</p>
          ) : (
            <div className="space-y-2">
              {sortedAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-500 w-24">
                      {new Date(a.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    {a.isRestDay ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Rest Day</span>
                    ) : a.shiftTemplate ? (
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.shiftTemplate.color }} />
                        <span className="text-xs font-semibold">{a.shiftTemplate.name}</span>
                        <span className="font-mono text-[10px] text-[var(--muted)]">
                          {a.shiftTemplate.startTime} → {a.shiftTemplate.endTime}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">
                        Custom: {a.customStart} → {a.customEnd}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Remove this assignment?")) onDelete(a.id);
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete assignment"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--muted)]">
          {sortedAssignments.length} total assignment{sortedAssignments.length === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}
