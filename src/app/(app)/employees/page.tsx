import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getSessionUser, HR_ROLES, MANAGEMENT_ROLES } from "@/lib/auth";
import { Card, Badge, statusTone, EmptyState, PageHeader } from "@/components/ui";
import { formatCurrency, formatDate, fullName } from "@/lib/format";
import EmployeeSearch from "./search";

export const metadata = { title: "Employees" };

const PAGE_SIZE = 20;

async function loadEmployees(q: string, status: string, pageNum: number) {
  const where = {
    AND: [
      q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" as const } },
              { lastName: { contains: q, mode: "insensitive" as const } },
              { employeeNumber: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {},
      status ? { status: status as never } : {},
    ],
  };

  const [employees, total] = await Promise.all([
    db.employee.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { position: true, campaign: true, site: true },
    }),
    db.employee.count({ where }),
  ]);

  return { employees, total };
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSessionUser();
  if (!user) {
    return <EmptyState title="Not authenticated" hint="Please log in to view employee records." />;
  }
  if (!MANAGEMENT_ROLES.includes(user.role)) {
    return <EmptyState title="Not authorized" hint="You do not have access to employee records." />;
  }

  const { q = "", page = "1", status = "" } = await searchParams;
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const canEdit = HR_ROLES.includes(user.role);

  let data: { employees: Array<{
    id: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
    hireDate: Date;
    basicSalary: unknown;
    employmentType: string;
    status: string;
    position: { title: string } | null;
    campaign: { name: string } | null;
    site: { name: string } | null;
  }>; total: number };

  try {
    data = await loadEmployees(String(q), String(status), pageNum);
  } catch (err) {
    console.error("Failed to load employees:", err);
    return <EmptyState title="Failed to load employees" hint="Please try again later." />;
  }

  const { employees, total } = data;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Employees"
        subtitle={`${total} record${total === 1 ? "" : "s"} · 201 files`}
        actions={
          canEdit ? (
            <Link href="/employees/new" className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-strong)]">
              <Plus className="h-4 w-4" /> New Employee
            </Link>
          ) : null
        }
      />

      <Card className="mb-4 p-4">
        <Suspense>
          <EmployeeSearch initialQuery={String(q)} initialStatus={String(status)} />
        </Suspense>
      </Card>

      <Card>
        {employees.length === 0 ? (
          <EmptyState title="No employees found" hint="Try adjusting your search or onboard a new team member." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-5 py-3 font-semibold">Employee</th>
                  <th className="px-5 py-3 font-semibold">Position / Campaign</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Hired</th>
                  <th className="px-5 py-3 font-semibold text-right">Monthly Rate</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {employees.map((e) => (
                  <tr key={e.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link href={`/employees/${e.id}`} className="group flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          {fullName(e).split(" ").map((p) => p[0]).slice(0, 2).join("")}
                        </span>
                        <span>
                          <span className="block font-semibold group-hover:text-[var(--brand)]">{fullName(e)}</span>
                          <span className="block text-xs text-[var(--muted)]">{e.employeeNumber}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className="block">{e.position?.title ?? "—"}</span>
                      <span className="block text-xs text-[var(--muted)]">{e.campaign?.name ?? e.site?.name ?? "—"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={e.employmentType === "REGULAR" ? "green" : "amber"}>{e.employmentType}</Badge>
                    </td>
                    <td className="px-5 py-3 tabular-nums">{formatDate(e.hireDate)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{formatCurrency(e.basicSalary)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={statusTone(e.status)}>{e.status.replace(/_/g, " ")}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-sm">
            <p className="text-xs text-[var(--muted)]">
              Page {pageNum} of {totalPages}
            </p>
            <div className="flex gap-2">
              {pageNum > 1 ? (
                <Link href={{ query: { q, page: String(pageNum - 1), status } }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
                  Previous
                </Link>
              ) : null}
              {pageNum < totalPages ? (
                <Link href={{ query: { q, page: String(pageNum + 1), status } }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>
    </>
  );
}
