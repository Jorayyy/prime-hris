"use client";

import { useState } from "react";
import { Button, Card, CardHeader } from "@/components/ui";
import MonthlyCalendarView from "./monthly-calendar";
import WeeklyTimelineView from "./weekly-timeline";
import EmployeeScheduleModal from "./employee-schedule-modal";
import { deleteShiftAssignmentAction, deleteShiftAssignmentsByRangeAction } from "@/lib/actions/attendance";

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
  employeeId: string;
  employee: { firstName: string; lastName: string; employeeNumber: string };
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

export default function ScheduleCalendarWrapper({
  assignments,
  employees,
}: {
  assignments: Assignment[];
  employees: Employee[];
}) {
  const [view, setView] = useState<"monthly" | "weekly">("monthly");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeAssignments, setEmployeeAssignments] = useState<Assignment[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [deleteState, setDeleteState] = useState<{ error?: string; ok?: boolean; count?: number }>({});

  const filteredEmployees = employees.filter((e) =>
    employeeFilter
      ? `${e.lastName} ${e.firstName} ${e.employeeNumber}`.toLowerCase().includes(employeeFilter.toLowerCase())
      : true,
  );

  function openEmployeeModal(employee: Employee) {
    const empAssignments = assignments.filter((a) => a.employeeId === employee.id);
    setSelectedEmployee(employee);
    setEmployeeAssignments(empAssignments);
  }

  async function handleDeleteAssignment(id: string) {
    const result = await deleteShiftAssignmentAction(id);
    if (result.ok && selectedEmployee) {
      setEmployeeAssignments((prev) => prev.filter((a) => a.id !== id));
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    }
    setDeleteState(result);
  }

  const [localAssignments, setAssignments] = useState(assignments);

  return (
    <>
      <Card>
        <CardHeader
          title="Schedule Calendar"
          subtitle="View employee schedules in calendar format"
          action={
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-[var(--border)] bg-white pl-2">
                <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  placeholder="Find employee…"
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="w-44 border-0 bg-transparent px-2 py-1.5 text-xs outline-none placeholder:text-slate-400"
                />
              </div>
              <div className="flex rounded-lg border border-[var(--border)] bg-white">
                <button
                  onClick={() => setView("monthly")}
                  className={`rounded-l-lg px-3 py-1.5 text-xs font-medium transition ${
                    view === "monthly" ? "bg-[var(--brand)] text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setView("weekly")}
                  className={`rounded-r-lg px-3 py-1.5 text-xs font-medium transition ${
                    view === "weekly" ? "bg-[var(--brand)] text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Weekly
                </button>
              </div>
            </div>
          }
        />
        <div className="p-5">
          {view === "monthly" ? (
            <MonthlyCalendarView assignments={localAssignments} />
          ) : (
            <WeeklyTimelineView assignments={localAssignments} />
          )}
        </div>
      </Card>

      {filteredEmployees.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Employee Quick View</p>
          <div className="relative max-w-xs">
            <select
              onChange={(e) => {
                const emp = filteredEmployees.find((em) => em.id === e.target.value);
                if (emp) openEmployeeModal(emp);
                e.target.value = "";
              }}
              defaultValue=""
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium text-slate-700 appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)]"
            >
              <option value="" disabled>
                Select employee to view schedule…
              </option>
              {filteredEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.lastName}, {e.firstName} ({e.employeeNumber})
                </option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}

      {selectedEmployee ? (
        <EmployeeScheduleModal
          employee={selectedEmployee}
          assignments={employeeAssignments}
          onClose={() => setSelectedEmployee(null)}
          onDelete={handleDeleteAssignment}
        />
      ) : null}
    </>
  );
}
