"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Loader2, CheckCircle, ExternalLink, Eye } from "lucide-react";
import { processGroupAction } from "@/lib/actions/payroll";
import PayrollPreview from "./payroll-preview";

type Site = { id: string; name: string };
type Group = { id: string; name: string; siteId: string | null; monthlyRate: number; payFrequency: string; isActive: boolean; _count: { employees: number } };
type Period = { id: string; label: string; processed: { groupId: string; siteId: string }[] };

export default function ProcessGroupModal({
  periods,
  sites,
  groups,
}: {
  periods: Period[];
  sites: Site[];
  groups: Group[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState(periods[0]?.id ?? "");
  const [selectedSite, setSelectedSite] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [state, formAction, pending] = useActionState(processGroupAction, {} as { error?: string; ok?: boolean });

  const currentPeriod = periods.find((p) => p.id === selectedPeriodId);
  const filteredGroups = groups.filter((g) => g.siteId === selectedSite && g.isActive);

  function isProcessed(groupId: string, siteId: string) {
    return currentPeriod?.processed.some((p) => p.groupId === groupId && p.siteId === siteId) ?? false;
  }

  function reset() {
    setSelectedSite("");
    setSelectedGroupId("");
    setSelectedGroupName("");
    setShowPreview(false);
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); reset(); }}
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
              className={`relative rounded-2xl bg-white shadow-2xl overflow-hidden transition-all ${showPreview ? "w-full max-w-5xl" : "w-full max-w-lg"}`}
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h2 className="text-lg font-bold text-foreground">Process Payroll</h2>
                <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted hover:bg-surface-hover transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form action={formAction} className={`relative px-6 py-5 space-y-4 ${showPreview ? "max-h-[80vh] overflow-y-auto" : ""}`}>
                <input type="hidden" name="periodId" value={selectedPeriodId} />

                {pending && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/90 backdrop-blur-sm">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-semibold text-foreground">Processing {selectedGroupName || "group"}...</p>
                    <p className="text-xs text-muted">Computing payslips for all employees</p>
                  </div>
                )}

                {periods.length > 1 && (
                  <div>
                    <label className="label">Pay Period *</label>
                    <select
                      value={selectedPeriodId}
                      onChange={(e) => { setSelectedPeriodId(e.target.value); reset(); }}
                      className="field"
                    >
                      {periods.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="label">Site *</label>
                  <select
                    name="siteId"
                    value={selectedSite}
                    onChange={(e) => { setSelectedSite(e.target.value); setSelectedGroupId(""); setSelectedGroupName(""); setShowPreview(false); }}
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
                    <label className="label">Group *</label>
                    <div className="space-y-2">
                      {filteredGroups.length === 0 ? (
                        <p className="text-xs text-muted">No groups at this site.</p>
                      ) : (
                        filteredGroups.map((g) => {
                          const processed = isProcessed(g.id, selectedSite);
                          return (
                            <label
                              key={g.id}
                              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                                selectedGroupId === g.id
                                  ? "border-primary bg-primary/5"
                                  : processed
                                    ? "border-border bg-slate-50 opacity-60"
                                    : "border-border hover:border-primary/40"
                              }`}
                            >
                              <input
                                type="radio"
                                name="groupId"
                                value={g.id}
                                checked={selectedGroupId === g.id}
                                onChange={() => { setSelectedGroupId(g.id); setSelectedGroupName(g.name); setShowPreview(false); }}
                                disabled={processed}
                                className="accent-[var(--brand)]"
                              />
                              <div className="flex-1">
                                <span className="font-semibold">{g.name}</span>
                                <span className="ml-2 text-xs text-muted">{g._count.employees} employees</span>
                              </div>
                              {processed && <span className="text-xs font-medium text-emerald-600">Processed</span>}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {selectedGroupId && (
                  <div className="flex items-center gap-2">
                    {!showPreview ? (
                      <button
                        type="button"
                        onClick={() => setShowPreview(true)}
                        className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-hover transition-colors"
                      >
                        Preview Calculation
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPreview(false)}
                        className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-hover transition-colors"
                      >
                        Hide Preview
                      </button>
                    )}
                    <button
                      disabled={pending || (showPreview ? false : false)}
                      className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-50 transition-colors"
                    >
                      {pending ? "Processing..." : "Process Now"}
                    </button>
                  </div>
                )}

                {showPreview && selectedGroupId && (
                  <PayrollPreview
                    periodId={selectedPeriodId}
                    groupId={selectedGroupId}
                    siteId={selectedSite}
                  />
                )}

                {state.ok && (
                  <div className="rounded-lg bg-emerald-50 p-4 text-center">
                    <CheckCircle className="mx-auto mb-1 h-6 w-6 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-800">Payroll processed successfully</p>
                    <Link href={`/payroll/${selectedPeriodId}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
                      <Eye className="h-3.5 w-3.5" /> View Payslips
                    </Link>
                  </div>
                )}

                {state.error && (
                  <p className="text-center text-sm font-medium text-red-600">{state.error}</p>
                )}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
