"use client";

import { useState, useCallback } from "react";
import { Card, CardHeader } from "@/components/ui";
import { getEmployeeScheduleAction } from "@/lib/actions/attendance";
import MonthlyCalendarView from "./monthly-calendar";
import WeeklyTimelineView from "./weekly-timeline";

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

export default function ScheduleCalendarWrapper({ employees }: { employees: Employee[] }) {
  const [view, setView] = useState<"monthly" | "weekly">("monthly");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState("");

  const filteredEmployees = employees.filter((e) =>
    search
      ? `${e.lastName} ${e.firstName} ${e.employeeNumber}`.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  const fetchSchedule = useCallback(async (employeeId: string, year: number, month: number) => {
    setLoading(true);
    try {
      const result = await getEmployeeScheduleAction(employeeId, year, month);
      if (result.ok) setAssignments(result.assignments);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  function selectEmployee(employee: Employee) {
    setSelectedEmployee(employee);
    setSearch("");
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    fetchSchedule(employee.id, year, month);
  }

  function changeMonth(delta: number) {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
    setCurrentDate(newDate);
    if (selectedEmployee) {
      fetchSchedule(selectedEmployee.id, newDate.getFullYear(), newDate.getMonth());
    }
  }

  function goToToday() {
    const today = new Date();
    setCurrentDate(today);
    if (selectedEmployee) {
      fetchSchedule(selectedEmployee.id, today.getFullYear(), today.getMonth());
    }
  }

  function changeWeek(delta: number) {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + delta * 7);
    setCurrentDate(newDate);
    if (selectedEmployee && view === "weekly") {
      fetchSchedule(selectedEmployee.id, newDate.getFullYear(), newDate.getMonth());
    }
  }

  function goToThisWeek() {
    const today = new Date();
    setCurrentDate(today);
    if (selectedEmployee) {
      fetchSchedule(selectedEmployee.id, today.getFullYear(), today.getMonth());
    }
  }

  return (
    <Card>
      <CardHeader
        title="Schedule Calendar"
        subtitle={selectedEmployee
          ? `${selectedEmployee.firstName} ${selectedEmployee.lastName} — ${selectedEmployee.employeeNumber}`
          : "Select an employee to view their schedule"
        }
        action={
          <div className="flex items-center gap-2">
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

      {/* Employee Selector */}
      <div className="border-b border-[var(--border)] px-5 py-3">
        <div className="relative max-w-sm">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search employee by name or number..."
            value={selectedEmployee ? `${selectedEmployee.firstName} ${selectedEmployee.lastName} (${selectedEmployee.employeeNumber})` : search}
            onChange={(e) => {
              if (!selectedEmployee) {
                setSearch(e.target.value);
              }
            }}
            onFocus={() => {
              if (selectedEmployee) {
                setSelectedEmployee(null);
                setAssignments([]);
                setSearch("");
              }
            }}
            readOnly={!!selectedEmployee}
            className="w-full rounded-lg border border-[var(--border)] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
          />
          {search && !selectedEmployee && filteredEmployees.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[var(--border)] bg-white shadow-lg">
              {filteredEmployees.slice(0, 10).map((e) => (
                <button
                  key={e.id}
                  onClick={() => selectEmployee(e)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <span className="font-medium text-slate-800">{e.lastName}, {e.firstName}</span>
                    <span className="ml-2 text-xs text-slate-400">{e.employeeNumber}</span>
                  </div>
                  {e.campaign && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      {e.campaign.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-5">
        {!selectedEmployee ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-slate-100 p-3">
              <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-500">Pick an employee above to see their schedule</p>
            <p className="mt-1 text-xs text-slate-400">Search by name or employee number</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
            <span className="ml-2 text-sm text-slate-500">Loading schedule...</span>
          </div>
        ) : view === "monthly" ? (
          <MonthlyCalendarView
            assignments={assignments}
            currentDate={currentDate}
            onPrevMonth={() => changeMonth(-1)}
            onNextMonth={() => changeMonth(1)}
            onToday={goToToday}
          />
        ) : (
          <WeeklyTimelineView
            assignments={assignments}
            currentDate={currentDate}
            onPrevWeek={() => changeWeek(-1)}
            onNextWeek={() => changeWeek(1)}
            onThisWeek={goToThisWeek}
          />
        )}
      </div>
    </Card>
  );
}
