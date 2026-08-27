"use client";

import { motion } from "framer-motion";
import { Gift, Cake } from "lucide-react";
import { Card, CardHeader, Avatar } from "@/components/ui";

type Person = {
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  hireDate: Date;
};

function getAge(date: Date) {
  const today = new Date();
  return today.getFullYear() - date.getFullYear();
}

function getYearsOfService(hireDate: Date) {
  const today = new Date();
  return today.getFullYear() - hireDate.getFullYear();
}

export default function BirthdaysWidget({ employees }: { employees: Person[] }) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  const birthdays = employees
    .filter((e) => e.dateOfBirth && new Date(e.dateOfBirth).getMonth() === currentMonth)
    .sort((a, b) => {
      const aDay = new Date(a.dateOfBirth!).getDate();
      const bDay = new Date(b.dateOfBirth!).getDate();
      // Upcoming first, then past
      const aDiff = aDay - currentDay;
      const bDiff = bDay - currentDay;
      if (aDiff >= 0 && bDiff < 0) return -1;
      if (aDiff < 0 && bDiff >= 0) return 1;
      return aDiff - bDiff;
    });

  const anniversaries = employees
    .filter((e) => new Date(e.hireDate).getMonth() === currentMonth)
    .sort((a, b) => new Date(a.hireDate).getDate() - new Date(b.hireDate).getDate());

  return (
    <Card>
      <CardHeader title="Celebrations" subtitle={new Date(today).toLocaleDateString("en-US", { month: "long", year: "numeric" })} />
      <div className="p-4 space-y-4">
        {birthdays.length === 0 && anniversaries.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No celebrations this month.</p>
        ) : (
          <>
            {birthdays.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Cake className="h-4 w-4 text-pink-500" />
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">Birthdays</p>
                </div>
                <div className="space-y-2">
                  {birthdays.map((e, i) => {
                    const day = new Date(e.dateOfBirth!).getDate();
                    const isToday = day === currentDay;
                    const isPast = day < currentDay;
                    return (
                      <motion.div
                        key={`${e.firstName}-${e.lastName}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex items-center gap-3 rounded-lg p-2 ${isToday ? "bg-pink-50 border border-pink-200" : isPast ? "opacity-50" : "hover:bg-surface-hover"}`}
                      >
                        <Avatar name={`${e.firstName} ${e.lastName}`} size="sm" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{e.firstName} {e.lastName}</p>
                          <p className="text-xs text-muted">{day} {new Date(e.dateOfBirth!).toLocaleDateString("en-US", { month: "long" })} · Turns {getAge(new Date(e.dateOfBirth!))}</p>
                        </div>
                        {isToday && <span className="text-lg">🎉</span>}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {anniversaries.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="h-4 w-4 text-amber-500" />
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">Work Anniversaries</p>
                </div>
                <div className="space-y-2">
                  {anniversaries.map((e, i) => {
                    const day = new Date(e.hireDate).getDate();
                    const isToday = day === currentDay;
                    return (
                      <motion.div
                        key={`${e.firstName}-${e.lastName}-anniv`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex items-center gap-3 rounded-lg p-2 ${isToday ? "bg-amber-50 border border-amber-200" : "hover:bg-surface-hover"}`}
                      >
                        <Avatar name={`${e.firstName} ${e.lastName}`} size="sm" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{e.firstName} {e.lastName}</p>
                          <p className="text-xs text-muted">{getYearsOfService(new Date(e.hireDate))} year(s) on {day} {new Date(e.hireDate).toLocaleDateString("en-US", { month: "long" })}</p>
                        </div>
                        {isToday && <span className="text-lg">🎊</span>}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
