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

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return { hours: h, minutes: m };
}

export default function WeeklyTimelineView({ assignments }: { assignments: Assignment[] }) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const assignmentMap = useMemo(() => {
    const map = new Map<string, Assignment>();
    for (const a of assignments) {
      map.set(a.date, a);
    }
    return map;
  }, [assignments]);

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }

  function thisWeek() {
    setWeekStart(getWeekStart(new Date()));
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={prevWeek} className="px-2 py-1">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Button>
          <h3 className="text-sm font-bold">
            {weekStart.toLocaleDateString("default", { month: "short", day: "numeric" })} -{" "}
            {weekDays[6].toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}
          </h3>
          <Button variant="secondary" onClick={nextWeek} className="px-2 py-1">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Button>
          <Button variant="ghost" onClick={thisWeek} className="ml-2 text-xs">This Week</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="w-16 border-r border-slate-200 px-2 py-2 text-[10px] font-bold uppercase text-slate-500">Hour</th>
              {weekDays.map((d) => {
                const isToday = formatDate(d) === formatDate(new Date());
                return (
                  <th key={d.toISOString()} className={`border-r border-slate-200 px-2 py-2 text-center ${isToday ? "bg-blue-50" : ""}`}>
                    <div className="text-[10px] font-bold uppercase text-slate-500">{DAYS[d.getDay()]}</div>
                    <div className={`text-xs font-semibold ${isToday ? "text-blue-600" : "text-slate-700"}`}>{d.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour} className={hour % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                <td className="border-r border-b border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-400 text-right">
                  {String(hour).padStart(2, "0")}:00
                </td>
                {weekDays.map((d) => {
                  const dateStr = formatDate(d);
                  const assignment = assignmentMap.get(dateStr);
                  const template = assignment?.shiftTemplate;
                  let isInShift = false;

                  if (template && !assignment?.isRestDay) {
                    const start = parseTime(template.startTime);
                    const end = parseTime(template.endTime);
                    const startMinutes = start.hours * 60 + start.minutes;
                    const endMinutes = end.hours * 60 + end.minutes;
                    const currentMinutes = hour * 60;

                    if (startMinutes <= endMinutes) {
                      isInShift = currentMinutes >= startMinutes && currentMinutes < endMinutes;
                    } else {
                      isInShift = currentMinutes >= startMinutes || currentMinutes < endMinutes;
                    }
                  }

                  return (
                    <td key={dateStr} className="border-r border-b border-slate-200 px-1 py-1">
                      {isInShift && template ? (
                        <div
                          className="rounded px-1 py-0.5 text-[10px] font-medium text-white"
                          style={{ background: template.color }}
                        >
                          {template.name}
                        </div>
                      ) : assignment?.isRestDay && hour === 12 ? (
                        <div className="rounded bg-slate-200 px-1 py-0.5 text-[10px] font-medium text-slate-600 text-center">
                          REST
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
