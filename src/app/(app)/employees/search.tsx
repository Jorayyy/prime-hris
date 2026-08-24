"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, XCircle } from "lucide-react";

const STATUSES = ["ACTIVE", "PROBITIONARY", "CONTRACTUAL", "ON_LEAVE", "RESIGNED", "TERMINATED", "END_OF_CONTRACT", "AWOL"];

export default function EmployeeSearch({ initialQuery, initialStatus }: { initialQuery: string; initialStatus: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);

  function apply(nextQ = q, nextStatus = status) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextQ) params.set("q", nextQ);
    else params.delete("q");
    if (nextStatus) params.set("status", nextStatus);
    else params.delete("status");
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <div className="relative min-w-60 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="field pl-9"
          placeholder="Search name or employee number…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onBlur={() => apply()}
        />
      </div>
      <select
        className="field w-auto"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value);
          apply(q, e.target.value);
        }}
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      {(q || status) ? (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setStatus("");
            apply("", "");
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
        >
          <XCircle className="h-3.5 w-3.5" /> Clear
        </button>
      ) : null}
    </form>
  );
}
