"use client";

import { useActionState, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Loader2 } from "lucide-react";
import { processGroupAction } from "@/lib/actions/payroll";

type Site = { id: string; name: string };
type Group = { id: string; name: string; siteId: string | null; monthlyRate: number; payFrequency: string; isActive: boolean; _count: { employees: number } };

export default function ProcessGroupModal({
  periodId,
  sites,
  groups,
  processed,
}: {
  periodId: string;
  sites: Site[];
  groups: Group[];
  processed: { groupId: string; siteId: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState("");
  const [state, formAction, pending] = useActionState(processGroupAction, {} as { error?: string; ok?: boolean });

  const filteredGroups = groups.filter((g) => g.siteId === selectedSite && g.isActive);

  function isProcessed(groupId: string, siteId: string) {
    return processed.some((p) => p.groupId === groupId && p.siteId === siteId);
  }

  if (state?.ok) {
    setTimeout(() => setOpen(false), 1500);
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setSelectedSite(""); }}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
      >
        <Play className="h-4 w-4" /> Process Group
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h2 className="text-lg font-bold text-foreground">Process Payroll by Group</h2>
                <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted hover:bg-surface-hover transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form action={formAction} className="px-6 py-5 space-y-4">
                <input type="hidden" name="periodId" value={periodId} />

                <div>
                  <label className="label">Select Site *</label>
                  <select
                    name="siteId"
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="field"
                  >
                    <option value="">Choose a site...</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {selectedSite && (
                  <div>
                    <label className="label">Select Group *</label>
                    <div className="space-y-2">
                      {filteredGroups.length === 0 ? (
                        <p className="text-sm text-muted py-2">No active groups at this site.</p>
                      ) : (
                        filteredGroups.map((g) => {
                          const done = isProcessed(g.id, selectedSite);
                          return (
                            <label
                              key={g.id}
                              className={`flex items-center gap-3 rounded-lg border p-3 transition-all cursor-pointer ${
                                done ? "border-border bg-gray-50 opacity-60" : "border-border hover:border-primary-light hover:shadow-sm"
                              }`}
                            >
                              <input
                                type="radio"
                                name="groupId"
                                value={g.id}
                                disabled={done}
                                required
                                className="h-4 w-4 text-primary focus:ring-primary"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-foreground">{g.name}</p>
                                  {done && <span className="text-[10px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded">PROCESSED</span>}
                                </div>
                                <p className="text-xs text-muted">
                                  ₱{Number(g.monthlyRate).toLocaleString()}/mo · {g.payFrequency.replace(/_/g, " ")} · {g._count.employees} employee(s)
                                </p>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {state?.error && <p className="text-sm font-medium text-danger">{state.error}</p>}
                {pending && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing payroll... This may take a moment.</span>
                  </div>
                )}
                {state?.ok && !pending && <p className="text-sm font-medium text-success">Group processed successfully!</p>}

                <div className="flex justify-end gap-3 pt-2 border-t border-border">
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-surface-hover transition-colors">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pending || !selectedSite || filteredGroups.every((g) => isProcessed(g.id, selectedSite))}
                    className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
                  >
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {pending ? "Processing..." : "Process Selected Group"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
