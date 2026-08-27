import Link from "next/link";
import { Clock, ShieldCheck, Users, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import BundyWidget from "@/components/bundy-widget";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  let settings: { name?: string | null } | null = null;
  let user: Awaited<ReturnType<typeof getSessionUser>> = null;
  try {
    [settings, user] = await Promise.all([db.companySettings.findFirst(), getSessionUser()]);
  } catch {
    // DB cold-start or missing DATABASE_URL at runtime — render with defaults
  }
  const company = settings?.name ?? "HRIS";

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 font-bold tracking-tight text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] text-sm text-white">
              HR
            </span>
            {company}
          </div>
          <Link
            href={user ? "/dashboard" : "/login"}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {user ? "Open Dashboard" : "Employee Login"}
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-14 lg:grid-cols-2">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Clock className="h-3.5 w-3.5" /> Human Resources Information System
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            One system for your people, time, and payroll.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600">
            Built for BPO operations — 24/7 shift scheduling, night differential,
            Philippine government contributions, leave management, and self-service.
            Clock in right here on the bundy.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { icon: Users, label: "201 Records", desc: "Complete employee files" },
              { icon: Clock, label: "Time & Attendance", desc: "Graveyard-safe DTR" },
              { icon: Wallet, label: "Payroll", desc: "SSS · PHIC · HDMF · BIR" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
                <Icon className="h-5 w-5 text-[var(--brand)]" />
                <dt className="mt-2 text-sm font-bold text-slate-800">{label}</dt>
                <dd className="text-xs text-slate-500">{desc}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-8 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Sessions are encrypted and every punch is audit-logged.
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <BundyWidget company={company} />
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {company} · Powered by HRIS
      </footer>
    </main>
  );
}
