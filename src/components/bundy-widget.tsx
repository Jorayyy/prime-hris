"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, LoaderCircle } from "lucide-react";

type BundyResult = {
  ok: boolean;
  error?: string;
  type?: "CLOCK_IN" | "CLOCK_OUT";
  name?: string;
  timestamp?: string;
  message?: string;
};

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const immediate = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(immediate);
      clearInterval(t);
    };
  }, []);
  return now;
}

export default function BundyWidget({ company }: { company: string }) {
  const router = useRouter();
  const now = useClock();
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BundyResult | null>(null);

  async function punch(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/bundy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeNumber, pin }),
      });
      const data: BundyResult = await res.json();
      setResult(data);
      if (data.ok) {
        setEmployeeNumber("");
        setPin("");
        setTimeout(() => setResult(null), 8000);
      }
    } catch {
      setResult({ ok: false, error: "Network error. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5 text-center">
        <div className="font-mono text-4xl font-bold tabular-nums tracking-tight text-slate-900">
          {now ? now.toLocaleTimeString("en-PH", { hour12: true }) : "--:--:--"}
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {now
            ? now.toLocaleDateString("en-PH", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "\u00a0"}
        </div>
      </div>

      <form onSubmit={punch} className="space-y-3">
        <div>
          <label htmlFor="bundy-emp" className="label">
            Employee Number
          </label>
          <input
            id="bundy-emp"
            className="field text-center font-mono text-lg uppercase tracking-widest"
            placeholder="e.g. EMP0001"
            value={employeeNumber}
            onChange={(e) => setEmployeeNumber(e.target.value)}
            autoComplete="off"
            required
          />
        </div>
        <div>
          <label htmlFor="bundy-pin" className="label">
            PIN
          </label>
          <input
            id="bundy-pin"
            type="password"
            inputMode="numeric"
            pattern="\d*"
            maxLength={8}
            className="field text-center font-mono text-lg tracking-widest"
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            autoComplete="off"
            required
          />
        </div>

        <button
          type="submit"
          disabled={busy || !employeeNumber || pin.length < 4}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--brand-strong)] disabled:opacity-50"
        >
          {busy ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          CLOCK IN / OUT
        </button>
      </form>

      {result ? (
        result.ok ? (
          <div
            className={`mt-4 rounded-lg px-4 py-3 text-sm font-semibold ${
              result.type === "CLOCK_IN"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {result.type === "CLOCK_IN" ? (
              <LogIn className="mr-2 inline h-4 w-4" />
            ) : (
              <LogOut className="mr-2 inline h-4 w-4" />
            )}
            {result.message}
          </div>
        ) : (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {result.error}
          </div>
        )
      ) : null}

      <div className="mt-5 border-t border-slate-100 pt-4 text-center">
        <button
          onClick={() => router.push("/login")}
          className="text-xs font-semibold text-[var(--brand)] hover:underline"
        >
          Go to {company} HR portal →
        </button>
      </div>
    </div>
  );
}
