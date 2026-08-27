"use client";

import { motion } from "framer-motion";
import { TrendingUp, Users, Clock, CalendarOff } from "lucide-react";
import { Card, CardHeader, ProgressBar } from "@/components/ui";

type KPIs = {
  attendanceRate: number;
  tardinessRate: number;
  leaveUtilization: number;
  absenteeismRate: number;
};

export default function PerformanceKPIs({ kpis }: { kpis: KPIs }) {
  const items = [
    { label: "Attendance Rate", value: kpis.attendanceRate, icon: Users, color: "success", target: 95 },
    { label: "Tardiness Rate", value: kpis.tardinessRate, icon: Clock, color: "warning", target: 5, invert: true },
    { label: "Leave Utilization", value: kpis.leaveUtilization, icon: CalendarOff, color: "primary", target: 80 },
    { label: "Absenteeism Rate", value: kpis.absenteeismRate, icon: TrendingUp, color: "danger", target: 3, invert: true },
  ];

  return (
    <Card>
      <CardHeader title="Performance KPIs" subtitle="This month" />
      <div className="p-4 space-y-4">
        {items.map((item, i) => {
          const isGood = item.invert ? item.value <= item.target : item.value >= item.target;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center gap-2">
                  <item.icon className={`h-4 w-4 text-${item.color}`} />
                  <span className="font-medium text-foreground">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold tabular-nums ${isGood ? "text-success" : "text-danger"}`}>
                    {item.value.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted">target: {item.invert ? "≤" : "≥"}{item.target}%</span>
                </div>
              </div>
              <ProgressBar
                value={Math.min(item.value, 100)}
                color={isGood ? "success" : item.color as any}
                size="sm"
              />
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
