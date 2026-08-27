import { db } from "@/lib/db";
import { getSessionUser, HR_ROLES } from "@/lib/auth";
import AdminDashboard from "./admin-dashboard";
import EmployeeDashboard from "./employee-dashboard";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const sessionUser = (await getSessionUser())!;
  const isAdmin = HR_ROLES.includes(sessionUser.role) || sessionUser.role === "MANAGER";

  if (isAdmin) {
    const [totalEmployees, activeEmployees, pendingLeaves, recentAttendance] = await Promise.all([
      db.employee.count({ where: { status: "ACTIVE" } }),
      db.employee.count({ where: { status: "ACTIVE" } }),
      db.leaveRequest.count({ where: { status: "PENDING" } }),
      db.attendanceDaily.findMany({
        orderBy: { workDate: "desc" },
        take: 50,
        include: { employee: { select: { firstName: true, lastName: true, employeeNumber: true } } },
      }),
    ]);

    const presentToday = recentAttendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    const lateToday = recentAttendance.filter((a) => a.status === "LATE").length;
    const absentToday = recentAttendance.filter((a) => a.status === "ABSENT").length;

    const pendingOvertime = await db.overtimeRequest.count({ where: { status: "PENDING" } });
    const activeCampaigns = await db.campaign.count({ where: { isActive: true } });

    const recentLeaves = await db.leaveRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        employee: { select: { firstName: true, lastName: true } },
        leaveType: { select: { name: true } },
      },
    });

    return (
      <AdminDashboard
        user={sessionUser}
        stats={{
          totalEmployees,
          activeEmployees,
          presentToday,
          lateToday,
          absentToday,
          pendingLeaves,
          pendingOvertime,
          activeCampaigns,
        }}
        recentLeaves={recentLeaves.map((l) => ({
          name: `${l.employee.firstName} ${l.employee.lastName}`,
          type: l.leaveType.name,
          dates: `${l.startDate.toLocaleDateString()} - ${l.endDate.toLocaleDateString()}`,
          days: Number(l.days),
          status: l.status,
        }))}
      />
    );
  }

  // Employee dashboard
  const employee = await db.employee.findFirst({
    where: { userId: sessionUser.id },
    include: {
      department: { select: { name: true } },
      position: { select: { title: true } },
      campaign: { select: { name: true } },
    },
  });

  if (!employee) {
    return <div className="p-8 text-center text-muted">Employee profile not found.</div>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayAttendance, recentAttendance, myLeaves, pendingLeaves, nextPayPeriod] = await Promise.all([
    db.attendanceDaily.findFirst({
      where: { employeeId: employee.id, workDate: today },
    }),
    db.attendanceDaily.findMany({
      where: { employeeId: employee.id },
      orderBy: { workDate: "desc" },
      take: 7,
    }),
    db.leaveBalance.findMany({
      where: { employeeId: employee.id, year: today.getFullYear() },
      include: { leaveType: { select: { code: true, name: true } } },
    }),
    db.leaveRequest.count({
      where: { employeeId: employee.id, status: "PENDING" },
    }),
    db.payPeriod.findFirst({
      where: { status: { in: ["DRAFT", "PROCESSING"] } },
      orderBy: { payDate: "asc" },
    }),
  ]);

  const totalLeaveUsed = myLeaves.reduce((sum, b) => sum + Number(b.used), 0);
  const totalLeaveEntitlement = myLeaves.reduce((sum, b) => sum + Number(b.entitlement) + Number(b.carriedOver), 0);

  const attendanceRate = recentAttendance.length > 0
    ? Math.round((recentAttendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length / recentAttendance.length) * 100)
    : 0;

  return (
    <EmployeeDashboard
      user={sessionUser}
      employee={{
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeNumber: employee.employeeNumber,
        department: employee.department?.name || "—",
        position: employee.position?.title || "—",
        campaign: employee.campaign?.name || "—",
      }}
      todayAttendance={todayAttendance ? {
        status: todayAttendance.status,
        scheduledStart: todayAttendance.scheduledStart || "20:00",
        scheduledEnd: todayAttendance.scheduledEnd || "06:00",
        actualIn: todayAttendance.actualIn?.toISOString() || null,
        actualOut: todayAttendance.actualOut?.toISOString() || null,
        lateMinutes: todayAttendance.lateMinutes,
        workedMinutes: todayAttendance.workedMinutes,
      } : null}
      recentAttendance={recentAttendance.map((a) => ({
        date: a.workDate.toISOString(),
        status: a.status,
        lateMinutes: a.lateMinutes,
        workedMinutes: a.workedMinutes,
      }))}
      leaveBalances={myLeaves.map((b) => ({
        code: b.leaveType.code,
        name: b.leaveType.name,
        used: Number(b.used),
        entitlement: Number(b.entitlement) + Number(b.carriedOver),
      }))}
      pendingLeavesCount={pendingLeaves}
      attendanceRate={attendanceRate}
      nextPayDate={nextPayPeriod?.payDate?.toISOString() || null}
    />
  );
}
