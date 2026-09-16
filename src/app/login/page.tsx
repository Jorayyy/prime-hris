import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
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
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] text-lg font-bold text-white shadow-lg">
            HR
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{company} HR Portal</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in with your work account</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-xl backdrop-blur-md">
          <div className="bg-gradient-to-r from-[var(--primary)]/5 to-transparent px-6 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--primary-dark)]">
              <Clock className="h-4 w-4" />
              Employee Login
            </div>
          </div>
          <div className="p-6">
            <LoginForm />
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Back to bundy clock
          </Link>
        </div>
      </div>
    </main>
  );
}
