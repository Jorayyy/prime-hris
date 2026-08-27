"use client";

import { motion } from "framer-motion";
import { Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";

type WeekData = {
  label: string;
  totalHours: number;
  overtimeHours: number;
};

export default function HoursTrendWidget({ weeks }: { weeks: WeekData[] }) {
  const maxHours = Math.max(...weeks.map((w) => w.totalHours), 1);

  return (
    <Card>
      <CardHeader title="Hours Worked" subtitle="Last 4 weeks" />
      <div className="p-4">
        {weeks.every((w) => w.totalHours === 0) ? (
          <p className="py-4 text-center text-sm text-muted">No hours data yet.</p>
        ) : (
          <div className="flex items-end gap-3 h-40">
            {weeks.map((w, i) => {
              const height = maxHours > 0 ? (w.totalHours / maxHours) * 100 : 0;
              const otHeight = maxHours > 0 ? (w.overtimeHours / maxHours) * 100 : 0;
              return (
                <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full relative" style={{ height: "100%" }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="absolute bottom-0 w-full rounded-t-lg bg-primary/80"
                    />
                    {otHeight > 0 && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${otHeight}%` }}
                        transition={{ duration: 0.5, delay: i * 0.1 + 0.2 }}
                        className="absolute bottom-0 w-full rounded-t-lg bg-warning"
                      />
                    )}
                  </div>
                  <p className="text-[10px] text-muted font-medium">{w.label}</p>
                  <p className="text-xs font-bold text-foreground tabular-nums">{w.totalHours.toFixed(0)}h</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
