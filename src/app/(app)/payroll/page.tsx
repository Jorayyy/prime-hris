import Link from "next/link";
import { Eye, Archive, Play } from "lucide-react";
import { db } from "@/lib/db";
import { getSessionUser, PAYROLL_ROLES } from "@/lib/auth";
import { Card, CardHeader, Badge, statusTone, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";
import NewPayPeriodForm from "./new-period-form";
import ProcessGroupModal from "./process-group-modal";
import ArchiveButton from "./archive-button";
import DeletePeriodButton from "./delete-period-button";

export const metadata = { title: "Payroll" };

export default async function PayrollPage() {
  const user = (await getSessionUser())!;
  if (!PAYROLL_ROLES.includes(user.role)) {
    return <EmptyState title="Not authorized" hint="Payroll is restricted to payroll officers and admins." />;
  }

  const [periods, sites, groups, archivedCount] = await Promise.all([
    db.payPeriod.findMany({
      where: { archivedAt: null },
      orderBy: { startDate: "desc" },
      include: {
        _count: { select: { payslips: true } },
        processedGroups: { include: { group: true, site: true } },
      },
    }),
    db.site.findMany({ orderBy: { name: "asc" } }),
    db.group.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { employees: true } } },
    }),
    db.payPeriod.count({ where: { archivedAt: { not: null } } }),
  ]);

  const unprocessedPeriods = periods.filter((p) => ["DRAFT", "PROCESSING", "FOR_APPROVAL"].includes(p.status));

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Payroll</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Philippine payroll runs with SSS, PhilHealth, Pag-IBIG, BIR withholding tax, night differential,
          holiday premiums, and 13th month tracking.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader title="New Pay Period" subtitle="Define the cut-off and payout date" />
        <NewPayPeriodForm />
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-sm font-bold">Pay Periods</h2>
            <p className="text-xs text-[var(--muted)]">{periods.length} active period{periods.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex items-center gap-2">
            {unprocessedPeriods.length > 0 && (
              <ProcessGroupModal
                periods={unprocessedPeriods.map((p) => ({
                  id: p.id,
                  label: `${formatDate(p.startDate)} – ${formatDate(p.endDate)}`,
                  processed: p.processedGroups.map((pg) => ({ groupId: pg.groupId, siteId: pg.siteId })),
                }))}
                sites={sites}
                groups={groups as any}
              />
            )}
            {archivedCount > 0 && (
              <Link
                href="/payroll/archived"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-[var(--muted)] hover:bg-surface-hover transition-colors"
              >
                <Archive className="h-3.5 w-3.5" /> Archived ({archivedCount})
              </Link>
            )}
          </div>
        </div>
        {periods.length === 0 ? (
          <EmptyState title="No pay periods yet" hint="Create your first pay period above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-5 py-3 font-semibold">Period</th>
                  <th className="px-5 py-3 font-semibold">Pay Date</th>
                  <th className="px-5 py-3 font-semibold">Frequency</th>
                  <th className="px-5 py-3 font-semibold">Payslips</th>
                  <th className="px-5 py-3 font-semibold">Groups Processed</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {periods.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold">
                      <Link href={`/payroll/${p.id}`} className="hover:text-[var(--brand)]">
                        {formatDate(p.startDate)} – {formatDate(p.endDate)}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{formatDate(p.payDate)}</td>
                    <td className="px-5 py-3">{p.frequency.replace(/_/g, " ")}</td>
                    <td className="px-5 py-3 tabular-nums">{p._count.payslips}</td>
                    <td className="px-5 py-3">
                      {p.processedGroups.length === 0 ? (
                        <span className="text-xs text-muted">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {p.processedGroups.map((pg) => (
                            <span key={pg.id} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                              {pg.site.name}: {pg.group.name}
                              <span className="text-muted">({pg.employeeCount})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(p.status)}>
                        {p._count.payslips > 0 && p.status === "PROCESSING" ? "PROCESSED" : p.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {p._count.payslips > 0 && (
                          <Link
                            href={`/payroll/${p.id}`}
                            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </Link>
                        )}
                        {["DRAFT", "PROCESSING", "FOR_APPROVAL"].includes(p.status) && (
                          <DeletePeriodButton periodId={p.id} />
                        )}
                        {["DRAFT", "FOR_APPROVAL"].includes(p.status) && (
                          <ArchiveButton periodId={p.id} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
