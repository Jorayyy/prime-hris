"use client";

import { motion } from "framer-motion";
import { Card, CardHeader } from "@/components/ui";

type Group = {
  name: string;
  count: number;
};

export default function HeadcountChart({ groups, title }: { groups: Group[]; title?: string }) {
  const max = Math.max(...groups.map((g) => g.count), 1);

  return (
    <Card>
      <CardHeader title={title ?? "Headcount by Group"} subtitle={`${groups.reduce((s, g) => s + g.count, 0)} total`} />
      <div className="p-4 space-y-3">
        {groups.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No data.</p>
        ) : (
          groups.map((g, i) => (
            <div key={g.name}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-foreground truncate">{g.name}</span>
                <span className="tabular-nums text-muted">{g.count}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(g.count / max) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
