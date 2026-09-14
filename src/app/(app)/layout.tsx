import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }
  if (!user) redirect("/login");

  let settings: { name?: string | null; logoUrl?: string | null } | null = null;
  try {
    settings = await db.companySettings.findFirst();
  } catch {}
  const company = settings?.name ?? "HRIS";

  // Build real notifications from DB — resilient to cold-start failures
  const now = new Date();
  let pendingLeaves: Array<{ id: string; createdAt: Date; employee: { firstName: string; lastName: string }; leaveType: { name: string } }> = [];
  let recentPayPeriod: { startDate: Date; endDate: Date } | null = null;
  let recentOvertime: Array<{ id: string; createdAt: Date; employee: { firstName: string; lastName: string }; requestedHours: any }> = [];
  let unreadMessages = 0;
  try {
    [pendingLeaves, recentPayPeriod, recentOvertime] = await Promise.all([
      db.leaveRequest.findMany({
        where: { status: "PENDING" },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          employee: { select: { firstName: true, lastName: true } },
          leaveType: { select: { name: true } },
        },
      }),
      db.payPeriod.findFirst({
        where: { status: "PAID" },
        orderBy: { payDate: "desc" },
      }),
      db.overtimeRequest.findMany({
        where: { status: "PENDING" },
        take: 3,
        orderBy: { createdAt: "desc" },
        include: { employee: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    // Count unread messages
    const participations = await db.chatParticipant.findMany({
      where: { userId: user.id },
      select: { lastReadAt: true, conversationId: true },
    });
    for (const p of participations) {
      const count = await db.chatMessage.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: user.id },
          createdAt: { gt: p.lastReadAt ?? new Date(0) },
        },
      });
      unreadMessages += count;
    }
  } catch {
    // DB may be cold-starting — render layout without notifications
  }

  const notifications: Array<{
    id: string;
    title: string;
    message: string;
    time: string;
    href: string;
    read: boolean;
  }> = [];

  for (const leave of pendingLeaves) {
    const daysAgo = Math.floor((now.getTime() - leave.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const timeLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;
    notifications.push({
      id: leave.id,
      title: "Leave request pending",
      message: `${leave.employee.firstName} ${leave.employee.lastName} — ${leave.leaveType.name}`,
      time: timeLabel,
      href: "/leaves",
      read: false,
    });
  }

  for (const ot of recentOvertime) {
    const daysAgo = Math.floor((now.getTime() - ot.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const timeLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;
    notifications.push({
      id: ot.id,
      title: "Overtime request pending",
      message: `${ot.employee.firstName} ${ot.employee.lastName} — ${ot.requestedHours}h`,
      time: timeLabel,
      href: "/attendance",
      read: false,
    });
  }

  if (recentPayPeriod) {
    notifications.push({
      id: "payroll",
      title: "Payroll processed",
      message: `Week of ${recentPayPeriod.startDate.toLocaleDateString()} — ${recentPayPeriod.endDate.toLocaleDateString()} is paid`,
      time: "Recent",
      href: "/payroll",
      read: true,
    });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="no-print"><Sidebar role={user.role} company={company} logoUrl={settings?.logoUrl ?? null} unreadMessages={unreadMessages} /></div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="no-print">
          <Header
            user={{
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: user.role,
            }}
            company={company}
            notifications={notifications}
          />
        </div>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
