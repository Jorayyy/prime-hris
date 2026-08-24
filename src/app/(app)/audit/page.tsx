import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { Card, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Audit Log" };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = (await getSessionUser())!;
  if (user.role !== "ADMIN") {
    return <EmptyState title="Not authorized" hint="Audit log is restricted to administrators." />;
  }

  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page ?? "1"), 10) || 1);
  const pageSize = 50;

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    db.auditLog.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Audit Log</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{total} events recorded</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-5 py-3 font-semibold">Actor</th>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-5 py-2.5 tabular-nums text-xs">{formatDateTime(l.createdAt)}</td>
                  <td className="px-5 py-2.5 text-xs">{l.userName ?? "system"}</td>
                  <td className="px-5 py-2.5 font-mono text-xs">{l.action}</td>
                  <td className="px-5 py-2.5 text-xs text-[var(--muted)]">{l.entity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-sm">
            <span className="text-xs text-[var(--muted)]">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 ? (
                <a href={`/audit?page=${page - 1}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">Previous</a>
              ) : null}
              {page < totalPages ? (
                <a href={`/audit?page=${page + 1}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">Next</a>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>
    </>
  );
}
