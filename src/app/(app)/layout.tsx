import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import Sidebar from "@/components/sidebar";
import { initials } from "@/lib/format";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const settings = await db.companySettings.findFirst();
  const company = settings?.name ?? "HRIS";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={user.role} company={company} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-white px-6">
          <div className="text-sm font-medium text-[var(--muted)]">{company} · HR Information System</div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold">
                {user.firstName ?? user.email}
                {user.lastName ? ` ${user.lastName}` : ""}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{user.role}</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              {initials(user.firstName, user.lastName) || "U"}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
