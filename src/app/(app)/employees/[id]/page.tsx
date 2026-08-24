import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PencilLine } from "lucide-react";
import { db } from "@/lib/db";
import { getSessionUser, HR_ROLES, MANAGEMENT_ROLES } from "@/lib/auth";
import { Card, CardHeader, Badge, statusTone } from "@/components/ui";
import EditEmployeeForm from "./edit-form";
import { formatCurrency, formatDate, fullName } from "@/lib/format";

export const metadata = { title: "Employee Record" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</span>
      <span className="text-right text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = (await getSessionUser())!;
  if (!MANAGEMENT_ROLES.includes(user.role)) notFound();

  const { id } = await params;

  const employee = await db.employee.findUnique({
    where: { id },
    include: {
      site: true,
      department: true,
      campaign: true,
      position: true,
      reportsTo: true,
      user: { select: { email: true, role: true, lastLoginAt: true, isActive: true } },
      salaryHistory: { orderBy: { effectiveAt: "desc" }, take: 10 },
      employmentHistory: { orderBy: { effectiveAt: "desc" }, take: 15 },
    },
  });

  if (!employee) notFound();

  const canEdit = HR_ROLES.includes(user.role);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/employees" className="mt-1 rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-lg font-bold text-blue-700">
            {fullName(employee).split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{fullName(employee)}</h1>
            <p className="text-sm text-[var(--muted)]">
              {employee.employeeNumber} · {employee.position?.title ?? "No position"}
              {employee.campaign ? ` · ${employee.campaign.name}` : ""}
            </p>
            <div className="mt-1.5 flex gap-2">
              <Badge tone={statusTone(employee.status)}>{employee.status.replace(/_/g, " ")}</Badge>
              <Badge tone={employee.employmentType === "REGULAR" ? "green" : "amber"}>
                {employee.employmentType}
              </Badge>
            </div>
          </div>
        </div>
        {canEdit ? (
          <Link
            href="#edit"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            <PencilLine className="h-4 w-4" /> Edit record
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Personal" />
          <div className="px-5 py-3">
            <Row label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
            <Row label="Gender" value={employee.gender?.replace(/_/g, " ") ?? "—"} />
            <Row label="Civil Status" value={employee.civilStatus ?? "—"} />
            <Row label="Mobile" value={employee.mobileNumber ?? "—"} />
            <Row label="Personal Email" value={employee.personalEmail ?? "—"} />
            <Row label="Address" value={employee.presentAddress ?? "—"} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Employment" />
          <div className="px-5 py-3">
            <Row label="Hire Date" value={formatDate(employee.hireDate)} />
            <Row label="Regularized" value={formatDate(employee.regularizedDate)} />
            <Row label="Monthly Rate" value={formatCurrency(employee.basicSalary)} />
            <Row label="Daily Rate (÷313)" value={formatCurrency(employee.dailyRate)} />
            <Row label="Site / Dept" value={[employee.site?.name, employee.department?.name].filter(Boolean).join(" · ") || "—"} />
            <Row label="Reports To" value={employee.reportsTo ? fullName(employee.reportsTo) : "—"} />
            <Row label="Separation" value={employee.separationDate ? `${formatDate(employee.separationDate)} (${employee.separationReason ?? "n/a"})` : "—"} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Government IDs & Account" />
          <div className="px-5 py-3">
            <Row label="SSS" value={employee.sssNumber ?? "—"} />
            <Row label="PhilHealth" value={employee.philhealthNumber ?? "—"} />
            <Row label="Pag-IBIG" value={employee.pagibigNumber ?? "—"} />
            <Row label="TIN" value={employee.tinNumber ?? "—"} />
            <Row label="Login Email" value={employee.user?.email ?? "—"} />
            <Row label="System Role" value={employee.user?.role ?? "—"} />
            <Row
              label="Bundy PIN"
              value={
                employee.bundyPinHash ? (
                  <span className="text-emerald-600">Set</span>
                ) : (
                  <span className="text-amber-600">Not set</span>
                )
              }
            />
            <Row label="Emergency" value={[employee.emergencyName, employee.emergencyPhone].filter(Boolean).join(" · ") || "—"} />
          </div>
        </Card>
      </div>

      {canEdit ? (
        <div id="edit" className="mt-8 scroll-mt-20">
          <EditSection employeeId={employee.id} />
        </div>
      ) : null}
    </>
  );
}

async function EditSection({ employeeId }: { employeeId: string }) {
  const [sites, departments, campaigns, positions, employee] = await Promise.all([
    db.site.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.campaign.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.position.findMany({ orderBy: { title: "asc" } }),
    db.employee.findUniqueOrThrow({
      where: { id: employeeId },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,
        dateOfBirth: true,
        gender: true,
        civilStatus: true,
        mobileNumber: true,
        personalEmail: true,
        presentAddress: true,
        emergencyName: true,
        emergencyRelation: true,
        emergencyPhone: true,
        sssNumber: true,
        philhealthNumber: true,
        pagibigNumber: true,
        tinNumber: true,
        employmentType: true,
        status: true,
        basicSalary: true,
        regularizedDate: true,
        separationDate: true,
        separationReason: true,
        siteId: true,
        departmentId: true,
        campaignId: true,
        positionId: true,
        reportsToId: true,
      },
    }),
  ]);

  return (
    <EditEmployeeForm
      employee={{ ...employee, basicSalary: Number(employee.basicSalary) }}
      sites={sites}
      departments={departments}
      campaigns={campaigns}
      positions={positions}
      employees={(
        await db.employee.findMany({
          where: { status: "ACTIVE", NOT: { id: employee.id } },
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
          take: 500,
        })
      ).map((e) => ({
        id: e.id,
        label: `${e.lastName}, ${e.firstName} (${e.employeeNumber})`,
      }))}
    />
  );
}
