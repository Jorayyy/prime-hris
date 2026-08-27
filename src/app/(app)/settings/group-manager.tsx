"use client";

import { useActionState, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Users, ToggleLeft, ToggleRight, MapPin } from "lucide-react";
import { cx } from "@/components/ui";
import { createGroupAction, updateGroupAction, deleteGroupAction, toggleGroupActiveAction } from "@/lib/actions/settings";

type Site = { id: string; name: string };

type Group = {
  id: string;
  name: string;
  description: string | null;
  siteId: string;
  site: { name: string };
  monthlyRate: number;
  payFrequency: string;
  nightDiffRate: number;
  riceAllowance: number;
  transpoAllowance: number;
  otherAllowance: number;
  isActive: boolean;
  _count: { employees: number };
};

const FREQ_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  SEMI_MONTHLY: "Semi-monthly",
  MONTHLY: "Monthly",
};

const EMPTY_FORM = {
  name: "",
  description: "",
  siteId: "",
  monthlyRate: "",
  payFrequency: "WEEKLY",
  nightDiffRate: "0.10",
  riceAllowance: "",
  transpoAllowance: "",
  otherAllowance: "",
};

export default function GroupManager({ groups, sites }: { groups: Group[]; sites: Site[] }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [createState, createFormAction, createPending] = useActionState(createGroupAction, {} as { error?: string; ok?: boolean });
  const [updateState, updateFormAction, updatePending] = useActionState(updateGroupAction, {} as { error?: string; ok?: boolean });

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(g: Group) {
    setEditing(g);
    setForm({
      name: g.name,
      description: g.description ?? "",
      siteId: g.siteId,
      monthlyRate: String(g.monthlyRate),
      payFrequency: g.payFrequency,
      nightDiffRate: String(g.nightDiffRate),
      riceAllowance: String(g.riceAllowance || ""),
      transpoAllowance: String(g.transpoAllowance || ""),
      otherAllowance: String(g.otherAllowance || ""),
    });
    setShowModal(true);
  }

  function close() {
    setShowModal(false);
    setEditing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this group?")) return;
    await deleteGroupAction(id);
  }

  const state = editing ? updateState : createState;
  const action = editing ? updateFormAction : createFormAction;
  const pending = editing ? updatePending : createPending;

  // Group by site
  const grouped = groups.reduce<Record<string, Group[]>>((acc, g) => {
    (acc[g.site.name] ??= []).push(g);
    return acc;
  }, {});

  return (
    <>
      <div className="flex items-center justify-between p-5">
        <p className="text-sm text-muted">{groups.length} group(s) across {Object.keys(grouped).length} site(s)</p>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors">
          <Plus className="h-4 w-4" /> Add Group
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted">No groups yet. Add one to define payroll defaults for a team at a site.</p>
      ) : (
        <div className="space-y-4 px-5 pb-5">
          {Object.entries(grouped).map(([siteName, siteGroups]) => (
            <div key={siteName}>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-3.5 w-3.5 text-muted" />
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{siteName}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {siteGroups.map((g, i) => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cx(
                      "rounded-xl border p-4 transition-all",
                      g.isActive ? "border-border bg-white hover:shadow-md" : "border-border bg-gray-50 opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{g.name}</p>
                          {g.description && <p className="text-xs text-muted">{g.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(g)} className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground transition-colors" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(g.id)} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger transition-colors" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-muted">Monthly Rate</p>
                        <p className="font-bold text-foreground">₱{Number(g.monthlyRate).toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-muted">Pay Frequency</p>
                        <p className="font-bold text-foreground">{FREQ_LABELS[g.payFrequency] ?? g.payFrequency}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-muted">Night Diff</p>
                        <p className="font-bold text-foreground">{(Number(g.nightDiffRate) * 100).toFixed(0)}%</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-muted">Allowances</p>
                        <p className="font-bold text-foreground">
                          ₱{Number(g.riceAllowance + g.transpoAllowance + g.otherAllowance).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted">{g._count.employees} employee(s)</span>
                      <button
                        onClick={() => toggleGroupActiveAction(g.id, !g.isActive)}
                        className="flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors"
                      >
                        {g.isActive ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5" />}
                        {g.isActive ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={close} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h2 className="text-lg font-bold text-foreground">{editing ? "Edit Group" : "Add Group"}</h2>
                <button onClick={close} className="rounded-lg p-1.5 text-muted hover:bg-surface-hover transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                action={async (fd) => {
                  if (editing) fd.set("id", editing.id);
                  action(fd);
                }}
                className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4"
              >
                <div>
                  <label className="label">Site *</label>
                  <select name="siteId" value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })} required className="field">
                    <option value="">Select a site</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Group Name *</label>
                  <input name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} className="field" placeholder="e.g., Team Alpha" />
                </div>

                <div>
                  <label className="label">Description</label>
                  <input name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={300} className="field" placeholder="Optional description" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Monthly Rate (₱) *</label>
                    <input name="monthlyRate" type="number" min={0} step={0.01} value={form.monthlyRate} onChange={(e) => setForm({ ...form, monthlyRate: e.target.value })} required className="field" placeholder="21000" />
                  </div>
                  <div>
                    <label className="label">Pay Frequency *</label>
                    <select name="payFrequency" value={form.payFrequency} onChange={(e) => setForm({ ...form, payFrequency: e.target.value })} className="field">
                      <option value="WEEKLY">Weekly</option>
                      <option value="BIWEEKLY">Bi-weekly</option>
                      <option value="SEMI_MONTHLY">Semi-monthly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Night Diff Rate (0.00 – 1.00)</label>
                  <input name="nightDiffRate" type="number" min={0} max={1} step={0.01} value={form.nightDiffRate} onChange={(e) => setForm({ ...form, nightDiffRate: e.target.value })} className="field" placeholder="0.10 = 10%" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Rice Allowance (₱)</label>
                    <input name="riceAllowance" type="number" min={0} step={0.01} value={form.riceAllowance} onChange={(e) => setForm({ ...form, riceAllowance: e.target.value })} className="field" placeholder="0" />
                  </div>
                  <div>
                    <label className="label">Transpo Allowance (₱)</label>
                    <input name="transpoAllowance" type="number" min={0} step={0.01} value={form.transpoAllowance} onChange={(e) => setForm({ ...form, transpoAllowance: e.target.value })} className="field" placeholder="0" />
                  </div>
                  <div>
                    <label className="label">Other Allowance (₱)</label>
                    <input name="otherAllowance" type="number" min={0} step={0.01} value={form.otherAllowance} onChange={(e) => setForm({ ...form, otherAllowance: e.target.value })} className="field" placeholder="0" />
                  </div>
                </div>

                {state?.error && <p className="text-sm font-medium text-danger">{state.error}</p>}
                {state?.ok && <p className="text-sm font-medium text-success">Saved!</p>}

                <div className="flex justify-end gap-3 pt-2 border-t border-border">
                  <button type="button" onClick={close} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-surface-hover transition-colors">
                    Cancel
                  </button>
                  <button disabled={pending} className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-50 transition-colors">
                    {pending ? "Saving..." : editing ? "Update Group" : "Create Group"}
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
