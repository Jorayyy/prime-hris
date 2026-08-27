"use client";

import { motion } from "framer-motion";
import { FileWarning } from "lucide-react";
import { Card, CardHeader, Badge } from "@/components/ui";

type DocExpiry = {
  employeeName?: string;
  documentName: string;
  expiresAt: Date;
  daysLeft: number;
};

export default function DocExpiryWidget({ documents }: { documents: DocExpiry[] }) {
  return (
    <Card>
      <CardHeader
        title="Document Expiry Alerts"
        subtitle={`${documents.length} expiring soon`}
        action={
          documents.length > 0 ? <Badge variant="red" size="sm">Action Needed</Badge> : <Badge variant="green" size="sm">All Clear</Badge>
        }
      />
      <div className="p-4 space-y-2">
        {documents.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No documents expiring in the next 30 days.</p>
        ) : (
          documents.map((d, i) => (
            <motion.div
              key={`${d.employeeName}-${d.documentName}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-border p-3 hover:shadow-sm transition-shadow"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${d.daysLeft <= 7 ? "bg-danger/10" : "bg-warning/10"}`}>
                <FileWarning className={`h-4 w-4 ${d.daysLeft <= 7 ? "text-danger" : "text-warning-dark"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{d.employeeName}</p>
                <p className="text-xs text-muted">{d.documentName}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${d.daysLeft <= 7 ? "text-danger" : "text-warning-dark"}`}>
                  {d.daysLeft}d
                </p>
                <p className="text-[10px] text-muted">left</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </Card>
  );
}
