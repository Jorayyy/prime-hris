"use client";

import { useState, useMemo } from "react";
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
  employeeId: string;
  employee: { firstName: string; lastName: string; employeeNumber: string };
  shiftTemplate: ShiftTemplate | null;
  customStart: string | null;
  customEnd: string | null;
  isRestDay: boolean;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function MonthlyCalendarView({ assignments }: { assignments: Assignment[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const assignmentMap = useMemo(() => {
    const map = new Map<string, Assignment>();
    for (const a of assignments) {
      map.set(a.date, a);
    }
    return map;
  }, [assignments]);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function today() {
    setCurrentDate(new Date());
  }

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="h-24 border border-slate-100 bg-slate-50/50" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const assignment = assignmentMap.get(dateStr);
    const isToday = new Date().toISOString().slice(0, 10) === dateStr;

    cells.push(
      <div key={day} className={`h-24 border border-slate-100 p-1.5 ${isToday ? "bg-blue-50" : "hover:bg-slate-50"}`}>
        <div className={`mb-1 text-xs font-medium ${isToday ? "text-blue-600" : "text-slate-500"}`}>
          {day}
        </div>
        {assignment ? (
          <div
            className="rounded px-1 py-0.5 text-[10px] font-medium text-white truncate"
            style={{ background: assignment.isRestDay ? "#94a3b8" : (assignment.shiftTemplate?.color ?? "#6b7280") }}
            title={`${assignment.employee.lastName}, ${assignment.employee.firstName} - ${assignment.isRestDay ? "Rest Day" : (assignment.shiftTemplate?.name ?? "Custom")}`}
          >
            {assignment.isRestDay ? "REST" : (
              assignment.shiftTemplate?.name ?? `${assignment.customStart}-${assignment.customEnd}`
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={prevMonth} className="px-2 py-1">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Button>
          <h3 className="text-sm font-bold">
            {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
          </h3>
          <Button variant="secondary" onClick={nextMonth} className="px-2 py-1">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Button>
          <Button variant="ghost" onClick={today} className="ml-2 text-xs">Today</Button>
        </div>
        <div className="text-xs text-[var(--muted)]">
          {assignments.length} assignment{assignments.length === 1 ? "" : "s"} this month
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-lg border border-slate-200 bg-slate-200 overflow-hidden">
        {DAYS.map((d) => (
          <div key={d} className="bg-slate-100 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {d}
          </div>
        ))}
        {cells}
      </div>
    </div>
  );
}
