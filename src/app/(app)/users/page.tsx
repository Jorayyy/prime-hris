import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { createUserAction, updateUserAction } from "@/lib/actions/users";
import { UserRow, CreateForm } from "./forms";

export const metadata = { title: "User Accounts" };

export default async function UsersPage() {
  const user = (await getSessionUser())!;
  if (user.role !== "SUPER_ADMIN") {
    return <EmptyState title="Not authorized" hint="Only the system owner can manage accounts." />;
  }

  const [users, unlinked] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "asc" },
      include: { employee: { select: { employeeNumber: true, firstName: true, lastName: true } } },
    }),
    db.employee.findMany({
      where: { user: null, status: "ACTIVE" },
      select: { id: true, employeeNumber: true, firstName: true, lastName: true },
      orderBy: { employeeNumber: "asc" },
      take: 100,
    }),
  ]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">User Accounts</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          System-wide account management. The SUPER_ADMIN (system owner) account cannot be modified here.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader title="All Accounts" subtitle={`${users.length} users`} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Linked Employee</th>
                  <th className="px-5 py-3 font-semibold">Last Login</th>
                  <th className="px-5 py-3 font-semibold">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {users.map((u) => (
                  <UserRow key={u.id} u={{
                    id: u.id,
                    email: u.email,
                    role: u.role,
                    isActive: u.isActive,
                    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
                    employee: u.employee
                      ? `${u.employee.firstName} ${u.employee.lastName} (${u.employee.employeeNumber})`
                      : null,
                  }} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Create Account" subtitle="Provision a login for staff" />
          <CreateForm
            action={createUserAction}
            employees={unlinked.map((e) => ({
              id: e.id,
              label: `${e.firstName} ${e.lastName} (${e.employeeNumber})`,
            }))}
          />
        </Card>
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">
        Deactivated accounts cannot sign in. Password resets force a change on next login (flag stored).
      </p>
    </>
  );
}

