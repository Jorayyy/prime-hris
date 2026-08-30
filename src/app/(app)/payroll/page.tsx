import Link from "next/link";
import { Eye } from "lucide-react";
import { db } from "@/lib/db";
import { getSessionUser, PAYROLL_ROLES } from "@/lib/auth";
import { Card, CardHeader, Badge, statusTone, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";
import NewPayPeriodForm from "./new-period-form";
import ProcessGroupModal from "./process-group-modal";

export const metadata = { title: "Payroll" };

export default async function PayrollPage() {
  const user = (await getSessionUser())!;
  if (!PAYROLL_ROLES.includes(user.role)) {
    return <EmptyState title="Not authorized" hint="Payroll is restricted to payroll officers and admins." />;
  }

  const [periods, sites, groups] = await Promise.all([
    db.payPeriod.findMany({
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
  ]);

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
        <CardHeader title="Pay Periods" subtitle={`${periods.length} period${periods.length === 1 ? "" : "s"}`} />
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
                  <th className="px-5 py-3 font-semibold">Actions</th>
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
                        <span className="text-xs text-muted">None</span>
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
                      <div className="flex items-center gap-2">
                        {p._count.payslips > 0 && (
                          <Link
                            href={`/payroll/${p.id}`}
                            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" /> View Payslips
                          </Link>
                        )}
                        {["DRAFT", "PROCESSING"].includes(p.status) && (
                          <ProcessGroupModal
                            periodId={p.id}
                            sites={sites}
                            groups={groups as any}
                            processed={p.processedGroups.map((pg) => ({ groupId: pg.groupId, siteId: pg.siteId }))}
                          />
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
