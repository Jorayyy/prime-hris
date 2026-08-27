"use client";

import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";

type Holiday = {
  date: Date;
  name: string;
  type: string;
};

export default function HolidayCalendarWidget({ holidays }: { holidays: Holiday[] }) {
  const today = new Date();
  const upcoming = holidays
    .filter((h) => new Date(h.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const past = holidays
    .filter((h) => new Date(h.date) < today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <Card>
      <CardHeader title="Holiday Calendar" subtitle={`${holidays.length} total declared`} />
      <div className="p-4 space-y-4">
        {upcoming.length === 0 && past.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No holidays declared.</p>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Upcoming</p>
                <div className="space-y-2">
                  {upcoming.map((h, i) => {
                    const d = new Date(h.date);
                    const daysUntil = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <motion.div
                        key={h.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface-hover"
                      >
                        <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-primary/10">
                          <span className="text-[10px] font-bold uppercase text-primary">{d.toLocaleDateString("en-US", { month: "short" })}</span>
                          <span className="text-sm font-bold text-primary">{d.getDate()}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{h.name}</p>
                          <p className="text-xs text-muted">
                            {h.type.replace(/_/g, " ")} · {daysUntil === 0 ? "Today!" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted mb-2">Recent</p>
                {past.map((h) => {
                  const d = new Date(h.date);
                  return (
                    <div key={h.name} className="flex items-center gap-3 rounded-lg p-2 opacity-60">
                      <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-slate-100">
                        <span className="text-[10px] font-bold uppercase text-muted">{d.toLocaleDateString("en-US", { month: "short" })}</span>
                        <span className="text-sm font-bold text-muted">{d.getDate()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{h.name}</p>
                        <p className="text-xs text-muted">{h.type.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
