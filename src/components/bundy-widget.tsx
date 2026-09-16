"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LogIn,
  LoaderCircle,
  Clock,
  Coffee,
  Utensils,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from "lucide-react";

type RecentPunch = {
  type: string;
  label: string;
  time: string;
};

type BundyResult = {
  ok: boolean;
  error?: string;
  type?: string;
  nextType?: string;
  employeeName?: string;
  position?: string | null;
  recentPunches?: RecentPunch[];
  timestamp?: string;
  message?: string;
};

const PUNCH_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  IN: LogIn,
  FIRST_BREAK_OUT: Coffee,
  FIRST_BREAK_IN: Coffee,
  LUNCH_OUT: Utensils,
  LUNCH_IN: Utensils,
  SECOND_BREAK_OUT: Coffee,
  SECOND_BREAK_IN: Coffee,
  OUT: LogOut,
};

const PUNCH_OPTIONS: Array<{ value: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "IN", label: "In", icon: LogIn },
  { value: "FIRST_BREAK_OUT", label: "1st Break Out", icon: Coffee },
  { value: "FIRST_BREAK_IN", label: "1st Break In", icon: Coffee },
  { value: "LUNCH_OUT", label: "Lunch Out", icon: Utensils },
  { value: "LUNCH_IN", label: "Lunch In", icon: Utensils },
  { value: "SECOND_BREAK_OUT", label: "2nd Break Out", icon: Coffee },
  { value: "SECOND_BREAK_IN", label: "2nd Break In", icon: Coffee },
  { value: "OUT", label: "Out", icon: LogOut },
];

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
  const [punchType, setPunchType] = useState("IN");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BundyResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const empInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<HTMLDivElement>(null);

  const triggerShake = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = "shake 0.5s ease-in-out";
  }, []);

  const triggerPulse = useCallback(() => {
    const el = pulseRef.current;
    if (!el) return;
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = "successPulse 0.8s ease-out";
  }, []);

  async function punch(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/bundy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeNumber, pin, type: punchType }),
      });
      const data: BundyResult = await res.json();
      setResult(data);
      if (data.ok) {
        setEmployeeNumber("");
        setPin("");
        if (data.nextType) setPunchType(data.nextType);
        triggerPulse();
        setTimeout(() => setResult(null), 10000);
      } else {
        triggerShake();
      }
    } catch {
      setResult({ ok: false, error: "Network error. Try again." });
    } finally {
      setBusy(false);
    }
  }

  const hours = now ? now.toLocaleTimeString("en-PH", { hour: "2-digit", hour12: false }) : "--";
  const minutes = now ? now.toLocaleTimeString("en-PH", { minute: "2-digit" }) : "--";
  const seconds = now ? now.toLocaleTimeString("en-PH", { second: "2-digit" }) : "--";
  const ampm = now ? now.toLocaleTimeString("en-PH", { hour: "2-digit", hour12: true }).slice(-2) : "";

  return (
    <div
      ref={cardRef}
      className="w-full max-w-md overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-xl backdrop-blur-md"
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes successPulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>

      {/* Gradient Header */}
      <div className="relative bg-gradient-to-br from-[var(--primary)] via-[var(--primary-dark)] to-[#1e40af] px-6 py-5 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20" />
          <div className="absolute -left-4 -bottom-4 h-24 w-24 rounded-full bg-white/10" />
        </div>
        <div className="relative text-center">
          <div className="font-mono text-5xl font-extrabold tabular-nums tracking-tight">
            <span>{hours}</span>
            <span className="animate-pulse opacity-70">:</span>
            <span>{minutes}</span>
            <span className="animate-pulse opacity-70">:</span>
            <span>{seconds}</span>
            <span className="ml-1 text-2xl font-bold opacity-80">{ampm}</span>
          </div>
          <div className="mt-1.5 text-sm font-medium text-white/80">
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
      </div>

      <div
        ref={pulseRef}
        className="p-6"
      >
        {result?.ok ? (
          <SuccessPanel result={result} onDismiss={() => setResult(null)} />
        ) : (
          <form ref={formRef} onSubmit={punch} className="space-y-3.5">
            <div>
              <label htmlFor="bundy-emp" className="label">
                Employee Number
              </label>
              <input
                ref={empInputRef}
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

            {/* Visual Punch Type Selector */}
            <div>
              <label className="label">Punch Type</label>
              <div className="grid grid-cols-4 gap-1.5">
                {PUNCH_OPTIONS.map((o) => {
                  const Icon = o.icon;
                  const active = punchType === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setPunchType(o.value)}
                      className={`flex flex-col items-center gap-1 rounded-lg px-1.5 py-2.5 text-[10px] font-semibold transition-all ${
                        active
                          ? "bg-[var(--brand)] text-white shadow-md ring-2 ring-[var(--brand)] ring-offset-1"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="leading-tight text-center">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {result && !result.ok && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 animate-fade-in">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {result.error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !employeeNumber || pin.length < 4}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--brand)] to-[var(--brand-strong)] px-4 py-3 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
            >
              {busy ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              PUNCH — {PUNCH_OPTIONS.find((o) => o.value === punchType)?.label.toUpperCase()}
            </button>
          </form>
        )}
      </div>

      <div className="border-t border-slate-100 px-6 py-3 text-center">
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

function SuccessPanel({
  result,
  onDismiss,
}: {
  result: BundyResult;
  onDismiss: () => void;
}) {
  const PunchIcon = PUNCH_ICONS[result.type ?? "IN"] ?? CheckCircle2;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Employee Recognition */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--success)] to-emerald-600 text-white shadow-md">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 truncate">{result.employeeName}</p>
          {result.position && (
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <Briefcase className="h-3 w-3" />
              {result.position}
            </p>
          )}
        </div>
      </div>

      {/* Punch Confirmation */}
      <div className="rounded-xl bg-emerald-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <PunchIcon className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-emerald-800">
              {result.type?.replace(/_/g, " ")}
            </p>
            <p className="text-xs text-emerald-600">{result.message}</p>
          </div>
        </div>
      </div>

      {/* Recent Punches */}
      {result.recentPunches && result.recentPunches.length > 0 && (
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Today&apos;s Punches
          </p>
          <div className="space-y-1.5">
            {result.recentPunches.map((p, i) => {
              const Icon = PUNCH_ICONS[p.type] ?? Clock;
              return (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                    {p.label}
                  </div>
                  <span className="font-mono font-semibold text-slate-700">{p.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={onDismiss}
        className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
      >
        New Punch
      </button>
    </div>
  );
}
