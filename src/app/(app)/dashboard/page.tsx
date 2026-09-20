import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser, HR_ROLES, PAYROLL_ROLES } from "@/lib/auth";
import AdminDashboard from "./admin-dashboard";
import EmployeeDashboard from "./employee-dashboard";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");
  const isAdmin = HR_ROLES.includes(sessionUser.role) || sessionUser.role === "MANAGER";
  const isPayroll = PAYROLL_ROLES.includes(sessionUser.role);

  try {
    if (isAdmin) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const [
        totalEmployees,
        todayAttendance,
        pendingLeaves,
        pendingOvertime,
        departments,
        latestPeriod,
        unresolvedExceptions,
        recentActivity,
        allEmployeesWithDept,
      ] = await Promise.all([
        db.employee.count({ where: { status: "ACTIVE" } }),

        db.attendanceDaily.findMany({
          where: { workDate: { gte: today, lt: todayEnd } },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true,
                departmentId: true,
                department: { select: { name: true } },
              },
            },
          },
        }),

        db.leaveRequest.count({ where: { status: "PENDING" } }),
        db.overtimeRequest.count({ where: { status: "PENDING" } }),

        db.department.findMany({
          where: { isActive: true },
          include: {
            employees: {
              where: { status: "ACTIVE" },
              select: { id: true },
            },
          },
        }),

        isPayroll
          ? db.payPeriod.findFirst({
              orderBy: { createdAt: "desc" },
              include: {
                _count: { select: { payslips: true } },
              },
            })
          : null,

        isPayroll
          ? db.payrollException.count({ where: { resolved: false } })
          : 0,

        db.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
        }),

        db.employee.findMany({
          where: { status: "ACTIVE" },
          select: {
            id: true,
            departmentId: true,
            department: { select: { id: true } },
          },
        }),
      ]);

      // Attendance counts
      const presentToday = todayAttendance.filter(
        (a) => a.status === "PRESENT" || a.status === "LATE"
      ).length;
      const lateToday = todayAttendance.filter((a) => a.status === "LATE").length;
      const absentToday = todayAttendance.filter((a) => a.status === "ABSENT").length;
      const onLeaveToday = todayAttendance.filter(
        (a) => a.status === "ON_LEAVE"
      ).length;

      // Employees with scheduled shifts today but no attendance record = not clocked in
      const scheduledToday = await db.shiftAssignment.findMany({
        where: { date: today, isRestDay: false },
        select: { employeeId: true },
      });
      const attendedIds = new Set(todayAttendance.map((a) => a.employeeId));
      const notClockedIn = scheduledToday.filter(
        (s) => !attendedIds.has(s.employeeId)
      ).length;

      // Attendance exceptions (problems only)
      const exceptions = todayAttendance
        .filter(
          (a) =>
            a.status === "LATE" ||
            a.status === "ABSENT" ||
            a.status === "INCOMPLETE" ||
            a.status === "ON_LEAVE"
        )
        .map((a) => ({
          id: a.id,
          employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
          employeeNumber: a.employee.employeeNumber,
          department: a.employee.department?.name || "—",
          schedule: a.scheduledStart
            ? `${a.scheduledStart}–${a.scheduledEnd || "?"}`
            : "—",
          clockIn: a.actualIn
            ? new Date(a.actualIn).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : null,
          status: a.status,
          lateMinutes: a.lateMinutes,
        }));

      // Department overview
      const deptMap = new Map<
        string,
        { name: string; total: number; present: number; late: number; absent: number }
      >();
      for (const dept of departments) {
        deptMap.set(dept.id, {
          name: dept.name,
          total: dept.employees.length,
          present: 0,
          late: 0,
          absent: 0,
        });
      }
      // Also count employees with no department
      const noDeptCount = allEmployeesWithDept.filter(
        (e) => !e.departmentId
      ).length;
      if (noDeptCount > 0) {
        deptMap.set("none", {
          name: "Unassigned",
          total: noDeptCount,
          present: 0,
          late: 0,
          absent: 0,
        });
      }

      for (const att of todayAttendance) {
        const deptId = att.employee.departmentId || "none";
        const entry = deptMap.get(deptId);
        if (!entry) continue;
        if (att.status === "PRESENT") entry.present++;
        else if (att.status === "LATE") {
          entry.late++;
          entry.present++; // late counts as present
        } else if (att.status === "ABSENT") entry.absent++;
      }

      const departmentStats = Array.from(deptMap.values())
        .filter((d) => d.total > 0)
        .map((d) => ({
          ...d,
          coverage:
            d.total > 0
              ? Math.round(((d.present) / d.total) * 100)
              : 0,
        }));

      // Pending actions summary
      const pendingPayrollExceptions = isPayroll ? unresolvedExceptions : 0;
      const totalPending = pendingLeaves + pendingOvertime + pendingPayrollExceptions;

      // Payroll status
      let payrollStatus = null;
      if (isPayroll && latestPeriod) {
        const totalActive = totalEmployees;
        const processed = latestPeriod._count.payslips;
        payrollStatus = {
          periodLabel: `${new Date(latestPeriod.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(latestPeriod.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          status: latestPeriod.status,
          processed,
          total: totalActive,
          exceptions: unresolvedExceptions,
          payDate: latestPeriod.payDate,
          id: latestPeriod.id,
        };
      }

      return (
        <AdminDashboard
          user={sessionUser}
          stats={{
            totalEmployees,
            presentToday,
            lateToday,
            absentToday,
            onLeaveToday,
            notClockedIn,
            pendingLeaves,
            pendingOvertime,
            pendingPayrollExceptions,
            totalPending,
          }}
          exceptions={exceptions}
          departmentStats={departmentStats}
          payrollStatus={payrollStatus}
          recentActivity={recentActivity.map((a) => ({
            id: a.id,
            userName: a.userName ?? "System",
            action: a.action,
            entity: a.entity,
            entityId: a.entityId,
            details: a.details as Record<string, unknown> | null,
            createdAt: a.createdAt.toISOString(),
          }))}
          isPayroll={isPayroll}
        />
      );
    }

    // Employee dashboard
    const employee = await db.employee.findFirst({
      where: { users: { some: { id: sessionUser.id } } },
      include: {
        department: { select: { name: true } },
        position: { select: { title: true } },
        campaign: { select: { name: true } },
      },
    });

    if (!employee) {
      return (
        <div className="p-8 text-center text-muted">
          Employee profile not found.
        </div>
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayAttendance,
      recentAttendance,
      myLeaves,
      pendingLeaves,
      nextPayPeriod,
    ] = await Promise.all([
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
        todayAttendance={
          todayAttendance
            ? {
                status: todayAttendance.status,
                scheduledStart: todayAttendance.scheduledStart || "20:00",
                scheduledEnd: todayAttendance.scheduledEnd || "06:00",
                actualIn: todayAttendance.actualIn?.toISOString() || null,
                actualOut: todayAttendance.actualOut?.toISOString() || null,
                lateMinutes: todayAttendance.lateMinutes,
                workedMinutes: todayAttendance.workedMinutes,
              }
            : null
        }
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
          entitlement:
            Number(b.entitlement) + Number(b.carriedOver),
        }))}
        pendingLeavesCount={pendingLeaves}
        nextPayDate={nextPayPeriod?.payDate?.toISOString() || null}
      />
    );
  } catch (err) {
    console.error("Dashboard load failed:", err);
    return (
      <div className="p-8 text-center text-muted">
        Failed to load dashboard data. Please try again later.
      </div>
    );
  }
}
