import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, HR_ROLES } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import NewEmployeeForm from "./form";

export const metadata = { title: "New Employee" };

export default async function NewEmployeePage() {
  try {
    await requireRole("ADMIN", "HR");
  } catch {
    redirect("/employees");
  }

  const [sites, departments, campaigns, positions, employees] = await Promise.all([
    db.site.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.campaign.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.position.findMany({ orderBy: { title: "asc" } }),
    db.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, employeeNumber: true },
      orderBy: [{ lastName: "asc" }],
      take: 500,
    }),
  ]);

  void HR_ROLES;

  return (
    <>
      <PageHeader
        title="Onboard Employee"
        subtitle="Creates the 201 record, system account, and bundy PIN in one step"
      />
      <NewEmployeeForm
        sites={sites}
        departments={departments}
        campaigns={campaigns}
        positions={positions.map((p) => ({ id: p.id, name: p.title }))}
        employees={employees.map((e) => ({
          id: e.id,
          label: `${e.lastName}, ${e.firstName} (${e.employeeNumber})`,
        }))}
      />
    </>
  );
}
