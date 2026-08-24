import { db } from "@/lib/db";
import { getSessionUser, MANAGEMENT_ROLES } from "@/lib/auth";
import { Card, CardHeader, Badge, statusTone, EmptyState } from "@/components/ui";
import { formatDate, fullName } from "@/lib/format";
import LeaveForms from "./leave-forms";
import LeaveDecisionForm from "./leave-decision-form";

export const metadata = { title: "Leave Management" };

export default async function LeavesPage() {
  const user = (await getSessionUser())!;
  const canApprove = MANAGEMENT_ROLES.includes(user.role);

  const [leaveTypes, myRequests, pendingQueue, balances] = await Promise.all([
    db.leaveType.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    user.employeeId
      ? db.leaveRequest.findMany({
          where: { employeeId: user.employeeId },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { leaveType: true },
        })
      : Promise.resolve([]),
    canApprove
      ? db.leaveRequest.findMany({
          where: { status: "PENDING" },
          orderBy: { createdAt: "asc" },
          include: { employee: true, leaveType: true },
        })
      : Promise.resolve([]),
    user.employeeId
      ? db.leaveBalance.findMany({
          where: { employeeId: user.employeeId, year: new Date().getFullYear() },
          include: { leaveType: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">Leave Management</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          File requests, track credits, and approve team leaves.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {canApprove ? (
            <Card>
              <CardHeader
                title="Approval Queue"
                subtitle={`${pendingQueue.length} request${pendingQueue.length === 1 ? "" : "s"} awaiting decision`}
              />
              {pendingQueue.length === 0 ? (
                <EmptyState title="All caught up" hint="No pending leave requests." />
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {pendingQueue.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div>
                        <p className="text-sm font-bold">{fullName(r.employee)}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {r.leaveType.name} · {formatDate(r.startDate)} → {formatDate(r.endDate)} · {Number(r.days)} day(s)
                        </p>
                        <p className="mt-0.5 max-w-md truncate text-xs italic text-slate-400">“{r.reason}”</p>
                      </div>
                      <LeaveDecisionForm requestId={r.id} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          <Card>
            <CardHeader title="My Leave History" subtitle="Your 20 most recent requests" />
            {myRequests.length === 0 ? (
              <EmptyState title="No requests yet" hint="File your first leave using the form on the right." />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {myRequests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-semibold">{r.leaveType.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {formatDate(r.startDate)} → {formatDate(r.endDate)} · {Number(r.days)}d
                        {r.remarks ? ` · ${r.remarks}` : ""}
                      </p>
                    </div>
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="My Credits" subtitle={`As of ${new Date().getFullYear()}`} />
            <div className="px-5 py-4">
              {balances.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No credit allocations yet.</p>
              ) : (
                balances.map((b) => {
                  const available = Number(b.entitlement) + Number(b.carriedOver) - Number(b.used) - Number(b.pending);
                  return (
                    <div key={b.id} className="mb-3 last:mb-0">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold">{b.leaveType.code}</span>
                        <span className="tabular-nums">
                          {available.toFixed(1)} / {(Number(b.entitlement) + Number(b.carriedOver)).toFixed(1)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--muted)]">
                        used {Number(b.used).toFixed(1)} · pending {Number(b.pending).toFixed(1)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="File a Request" />
            <LeaveForms leaveTypes={leaveTypes.map((t) => ({ id: t.id, name: `${t.name} (${t.code})` }))} />
          </Card>
        </div>
      </div>
    </>
  );
}
