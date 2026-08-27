import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import LoginForm from "@/components/login-form";

export const metadata = { title: "Sign In" };

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let company = "HRIS";
  try {
    const settings = await db.companySettings.findFirst();
    company = settings?.name ?? "HRIS";
  } catch {
    // DB may be cold-starting; use default
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand)] text-lg font-bold text-white">
            HR
          </span>
          <h1 className="text-xl font-bold tracking-tight">{company} HR Portal</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Sign in with your work account</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <LoginForm />
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-700 inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to bundy clock
          </Link>
        </div>
      </div>
    </main>
  );
}
