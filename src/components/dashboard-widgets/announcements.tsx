"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Pin, Trash2, Plus, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import { createAnnouncementAction, deleteAnnouncementAction, toggleAnnouncementPinAction } from "@/lib/actions/announcements";

type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Date;
};

export default function AnnouncementsWidget({ announcements, isAdmin }: { announcements: Announcement[]; isAdmin: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const sorted = [...announcements].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setMessage(null);
    const result = await createAnnouncementAction({} as any, formData);
    setPending(false);
    if (result?.ok) {
      setMessage({ type: "ok", text: "Posted!" });
      setShowForm(false);
    } else if (result?.error) {
      setMessage({ type: "error", text: result.error });
    }
  }

  return (
    <Card>
      <CardHeader
        title="Announcements"
        subtitle={`${announcements.length} post(s)`}
        action={
          isAdmin ? (
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark">
              {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showForm ? "Cancel" : "New"}
            </button>
          ) : null
        }
      />
      <div className="p-4 space-y-3">
        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              action={handleSubmit}
              className="space-y-3 overflow-hidden"
            >
              <input name="title" required maxLength={200} placeholder="Title" className="field w-full" />
              <textarea name="body" required maxLength={5000} rows={3} placeholder="Write your announcement..." className="field w-full resize-none" />
              <div className="flex items-center gap-2">
                <button type="submit" disabled={pending} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-50">
                  {pending ? "Posting..." : "Post Announcement"}
                </button>
                {message?.type === "error" && <p className="text-sm text-danger">{message.text}</p>}
                {message?.type === "ok" && <p className="text-sm text-success">{message.text}</p>}
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {sorted.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No announcements yet.</p>
        ) : (
          sorted.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Megaphone className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{a.title}</p>
                    <p className="text-xs text-muted mt-1 whitespace-pre-wrap">{a.body}</p>
                    <p className="text-[10px] text-muted-light mt-2">
                      {a.pinned && <Pin className="inline h-3 w-3 mr-1" />}
                      {new Date(a.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => toggleAnnouncementPinAction(a.id, !a.pinned)} className="rounded p-1 text-muted hover:bg-surface-hover" title={a.pinned ? "Unpin" : "Pin"}>
                      <Pin className={`h-3.5 w-3.5 ${a.pinned ? "text-primary fill-primary" : ""}`} />
                    </button>
                    <button onClick={() => { if (confirm("Delete?")) deleteAnnouncementAction(a.id); }} className="rounded p-1 text-muted hover:bg-danger/10 hover:text-danger" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </Card>
  );
}
