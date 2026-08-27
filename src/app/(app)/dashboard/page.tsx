import { db } from "@/lib/db";
import { getSessionUser, HR_ROLES } from "@/lib/auth";
import AdminDashboard from "./admin-dashboard";
import EmployeeDashboard from "./employee-dashboard";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const sessionUser = (await getSessionUser())!;
  const isAdmin = HR_ROLES.includes(sessionUser.role) || sessionUser.role === "MANAGER";

  if (isAdmin) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalEmployees, activeEmployees, pendingLeaves, pendingOvertime, activeCampaigns] = await Promise.all([
      db.employee.count({ where: { status: "ACTIVE" } }),
      db.employee.count({ where: { status: "ACTIVE" } }),
      db.leaveRequest.count({ where: { status: "PENDING" } }),
      db.overtimeRequest.count({ where: { status: "PENDING" } }),
      db.campaign.count({ where: { isActive: true } }),
    ]);

    const recentAttendance = await db.attendanceDaily.findMany({ orderBy: { workDate: "desc" }, take: 50 });
    const presentToday = recentAttendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    const lateToday = recentAttendance.filter((a) => a.status === "LATE").length;
    const absentToday = recentAttendance.filter((a) => a.status === "ABSENT").length;

    const recentLeaves = await db.leaveRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        employee: { select: { firstName: true, lastName: true } },
        leaveType: { select: { name: true } },
      },
    });

    const announcements = await db.announcement.findMany({ orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 10 });
    const allEmployees = await db.employee.findMany({
      where: { status: "ACTIVE" },
      select: { firstName: true, lastName: true, dateOfBirth: true, hireDate: true },
    });
    const groups = await db.group.findMany({
      where: { isActive: true },
      include: { _count: { select: { employees: true } } },
    });

    const pendingLeaveReqs = await db.leaveRequest.findMany({
      where: { status: "PENDING" },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { employee: { select: { firstName: true, lastName: true } }, leaveType: { select: { name: true } } },
    });
    const pendingOvertimeReqs = await db.overtimeRequest.findMany({
      where: { status: "PENDING" },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { employee: { select: { firstName: true, lastName: true } } },
    });

    const holidays = await db.holiday.findMany({ orderBy: { date: "asc" } });
    const expiringDocs = await db.employeeDocument.findMany({
      where: { expiresAt: { not: null, gte: today, lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) } },
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { expiresAt: "asc" },
    });
    const monthAttendance = await db.attendanceDaily.findMany({
      where: { workDate: { gte: monthStart, lte: today } },
    });

    // KPIs
    const totalDays = monthAttendance.length || 1;
    const presentDays = monthAttendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    const lateDays = monthAttendance.filter((a) => a.status === "LATE").length;
    const absentDays = monthAttendance.filter((a) => a.status === "ABSENT").length;
    const attendanceRate = Math.round((presentDays / totalDays) * 100);
    const tardinessRate = Math.round((lateDays / totalDays) * 100);
    const absenteeismRate = Math.round((absentDays / totalDays) * 100);

    const totalLeaveBalance = await db.leaveBalance.aggregate({
      _sum: { entitlement: true, used: true },
      where: { year: today.getFullYear() },
    });
    const totalEntitlement = Number(totalLeaveBalance._sum.entitlement ?? 0);
    const totalUsed = Number(totalLeaveBalance._sum.used ?? 0);
    const leaveUtilization = totalEntitlement > 0 ? Math.round((totalUsed / totalEntitlement) * 100) : 0;

    // Approvals
    const approvals = [
      ...pendingLeaveReqs.map((l: any) => ({
        id: l.id,
        type: "LEAVE" as const,
        employeeName: `${l.employee.firstName} ${l.employee.lastName}`,
        detail: `${l.leaveType.name} · ${Number(l.days)} day(s)`,
        date: l.createdAt.toLocaleDateString(),
      })),
      ...pendingOvertimeReqs.map((o: any) => ({
        id: o.id,
        type: "OVERTIME" as const,
        employeeName: `${o.employee.firstName} ${o.employee.lastName}`,
        detail: `${Number(o.requestedHours)}h on ${o.workDate.toLocaleDateString()}`,
        date: o.createdAt.toLocaleDateString(),
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

    const docExpiry = expiringDocs.map((d) => ({
      employeeName: `${d.employee.firstName} ${d.employee.lastName}`,
      documentName: d.name,
      expiresAt: d.expiresAt!,
      daysLeft: Math.ceil((d.expiresAt!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    }));

    // Hours trend (last 4 weeks)
    const weeks = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (w * 7 + today.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekAtt = monthAttendance.filter((a) => a.workDate >= weekStart && a.workDate <= weekEnd);
      const totalHours = weekAtt.reduce((s, a) => s + a.workedMinutes, 0) / 60;
      const overtimeHours = weekAtt.reduce((s, a) => s + a.overtimeMinutes, 0) / 60;
      weeks.push({
        label: `W${4 - w}`,
        totalHours: Math.round(totalHours * 10) / 10,
        overtimeHours: Math.round(overtimeHours * 10) / 10,
      });
    }

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
        announcements={announcements.map((a) => ({ ...a, createdAt: a.createdAt }))}
        birthdays={allEmployees}
        headcount={groups.map((g) => ({ name: g.name, count: g._count.employees }))}
        approvals={approvals}
        hoursTrend={weeks}
        docExpiry={docExpiry}
        holidays={holidays.map((h) => ({ ...h, date: h.date }))}
        kpis={{ attendanceRate, tardinessRate, leaveUtilization, absenteeismRate }}
        isAdmin={HR_ROLES.includes(sessionUser.role)}
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

  const [todayAttendance, recentAttendance, myLeaves, pendingLeaves, nextPayPeriod, announcements, holidays, expiringDocs] = await Promise.all([
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
    db.announcement.findMany({ orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 5 }),
    db.holiday.findMany({ orderBy: { date: "asc" } }),
    db.employeeDocument.findMany({
      where: {
        employeeId: employee.id,
        expiresAt: { not: null, gte: today, lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { expiresAt: "asc" },
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
      announcements={announcements.map((a) => ({ ...a, createdAt: a.createdAt }))}
      holidays={holidays.map((h) => ({ ...h, date: h.date }))}
      docExpiry={expiringDocs.map((d) => ({
        documentName: d.name,
        expiresAt: d.expiresAt!,
        daysLeft: Math.ceil((d.expiresAt!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      }))}
    />
  );
}
