"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";
import { Card, CardHeader, Badge, Avatar } from "@/components/ui";

type Approval = {
  id: string;
  type: "LEAVE" | "OVERTIME";
  employeeName: string;
  detail: string;
  date: string;
};

export default function ApprovalsWidget({ approvals }: { approvals: Approval[] }) {
  return (
    <Card>
      <CardHeader
        title="Quick Approvals"
        subtitle={`${approvals.length} pending`}
        action={
          <Link href="/leaves" className="text-xs font-semibold text-primary hover:text-primary-dark flex items-center gap-1">
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        }
      />
      <div className="p-4 space-y-2">
        {approvals.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">All caught up! No pending approvals.</p>
        ) : (
          approvals.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-border p-3 hover:shadow-sm transition-shadow"
            >
              <Avatar name={a.employeeName} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{a.employeeName}</p>
                <p className="text-xs text-muted">{a.type} · {a.detail}</p>
                <p className="text-[10px] text-muted-light">{a.date}</p>
              </div>
              <Badge variant={a.type === "LEAVE" ? "amber" : "blue"} size="sm">{a.type}</Badge>
            </motion.div>
          ))
        )}
      </div>
    </Card>
  );
}
