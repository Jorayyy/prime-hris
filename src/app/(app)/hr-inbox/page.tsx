import { notFound } from "next/navigation";
import { getSessionUser, HR_ROLES } from "@/lib/auth";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getHrInbox } from "@/lib/actions/hr-inbox";
import HrInboxActions from "./hr-inbox-actions";

export const metadata = { title: "HR Inbox" };

export default async function HrInboxPage() {
  const user = await getSessionUser();
  if (!user || !HR_ROLES.includes(user.role)) notFound();

  const items = await getHrInbox();

  const leaves = items.filter((i) => i.type === "leave");
  const overtime = items.filter((i) => i.type === "overtime");
  const payrollExc = items.filter((i) => i.type === "payroll_exception");
  const attendanceExc = items.filter((i) => i.type === "attendance_exception");

  const totalPending = leaves.length + overtime.length + payrollExc.length + attendanceExc.length;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight">HR Inbox</h1>
        <p className="mt-1 text-sm text-muted">
          Pending items requiring attention · {totalPending} total
        </p>
      </div>

      {totalPending === 0 ? (
        <Card>
          <EmptyState
            title="All caught up"
            hint="No pending items require your attention."
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Pending Leaves */}
          <Card>
            <CardHeader
              title="Leave Requests"
              subtitle={`${leaves.length} pending`}
              action={
                leaves.length > 0 ? (
                  <Badge variant="amber">{leaves.length}</Badge>
                ) : undefined
              }
            />
            {leaves.length === 0 ? (
              <p className="px-5 pb-4 text-xs text-muted">No pending leave requests.</p>
            ) : (
              <ul className="divide-y divide-border">
                {leaves.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{item.employeeName}</p>
                      <p className="text-xs text-muted truncate">{item.title} · {item.subtitle}</p>
                      <p className="text-[10px] text-muted-light mt-0.5">{formatDate(item.date)}</p>
                    </div>
                    <HrInboxActions item={item} currentUserId={user.id} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Overtime Requests */}
          <Card>
            <CardHeader
              title="Overtime Requests"
              subtitle={`${overtime.length} pending`}
              action={
                overtime.length > 0 ? (
                  <Badge variant="amber">{overtime.length}</Badge>
                ) : undefined
              }
            />
            {overtime.length === 0 ? (
              <p className="px-5 pb-4 text-xs text-muted">No pending overtime requests.</p>
            ) : (
              <ul className="divide-y divide-border">
                {overtime.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{item.employeeName}</p>
                      <p className="text-xs text-muted truncate">{item.subtitle}</p>
                      <p className="text-[10px] text-muted-light mt-0.5">{formatDate(item.date)}</p>
                    </div>
                    <HrInboxActions item={item} currentUserId={user.id} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Payroll Exceptions */}
          <Card>
            <CardHeader
              title="Payroll Exceptions"
              subtitle={`${payrollExc.length} unresolved`}
              action={
                payrollExc.length > 0 ? (
                  <Badge variant="red">{payrollExc.length}</Badge>
                ) : undefined
              }
            />
            {payrollExc.length === 0 ? (
              <p className="px-5 pb-4 text-xs text-muted">No unresolved payroll exceptions.</p>
            ) : (
              <ul className="divide-y divide-border">
                {payrollExc.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{item.employeeName}</p>
                      <p className="text-xs text-muted truncate">{item.title}</p>
                      <p className="text-[10px] text-muted-light mt-0.5">{item.subtitle}</p>
                    </div>
                    <HrInboxActions item={item} currentUserId={user.id} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Attendance Exceptions */}
          <Card>
            <CardHeader
              title="Attendance Exceptions"
              subtitle={`${attendanceExc.length} today`}
              action={
                attendanceExc.length > 0 ? (
                  <Badge variant="blue">{attendanceExc.length}</Badge>
                ) : undefined
              }
            />
            {attendanceExc.length === 0 ? (
              <p className="px-5 pb-4 text-xs text-muted">No attendance exceptions.</p>
            ) : (
              <ul className="divide-y divide-border">
                {attendanceExc.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{item.employeeName}</p>
                      <p className="text-xs text-muted truncate">{item.title}</p>
                      <p className="text-[10px] text-muted-light mt-0.5">{item.subtitle}</p>
                    </div>
                    <HrInboxActions item={item} currentUserId={user.id} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
