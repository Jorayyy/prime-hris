"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, ForbiddenError } from "@/lib/auth";
import { recordAudit } from "@/lib/actions/audit";
import {
  computePayslip,
  compute13thMonth,
  computeWithholdingTax,
  round2,
  type PayFrequencyCode,
} from "@/lib/payroll/ph";

const createPeriodSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  payDate: z.string(),
});

export async function createPayPeriodAction(_prev: { error?: string }, formData: FormData) {
  try {
    await requireRole("ADMIN", "PAYROLL");
  } catch {
    throw new ForbiddenError();
  }

  const parsed = createPeriodSchema.safeParse({
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    payDate: String(formData.get("payDate") ?? ""),
  });
  if (!parsed.success) return { error: "All dates are required." };

  const start = new Date(`${parsed.data.startDate}T00:00:00`);
  const end = new Date(`${parsed.data.endDate}T00:00:00`);
  const payDate = new Date(`${parsed.data.payDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || Number.isNaN(payDate.getTime())) {
    return { error: "Invalid dates." };
  }
  if (end < start) return { error: "End must be after start." };

  const overlap = await db.payPeriod.findFirst({
    where: { startDate: { lte: end }, endDate: { gte: start } },
  });
  if (overlap) return { error: "This period overlaps an existing pay period." };

  const settings = await db.companySettings.findFirst();

  const period = await db.payPeriod.create({
    data: {
      frequency: settings?.payFrequency ?? "SEMI_MONTHLY",
      startDate: start,
      endDate: end,
      payDate,
    },
  });

  await recordAudit({ action: "CREATE_PAY_PERIOD", entity: "PayPeriod", entityId: period.id });
  revalidatePath("/payroll");
  return {};
}

async function setPeriodStatus(periodId: string, action: "PROCESS" | "APPROVE" | "MARK_PAID") {
  const user =
    action === "APPROVE" || action === "MARK_PAID"
      ? await requireRole("ADMIN")
      : await requireRole("ADMIN", "PAYROLL");

  const period = await db.payPeriod.findUnique({ where: { id: periodId } });
  if (!period) return { error: "Period not found." };

  if (action === "PROCESS") {
    if (!["DRAFT", "PROCESSING"].includes(period.status)) {
      return { error: "Only DRAFT or PROCESSING periods can be processed." };
    }

    await db.payPeriod.update({ where: { id: periodId }, data: { status: "PROCESSING" } });

    try {
      const [employees, settings, holidays] = await Promise.all([
        db.employee.findMany({
          where: { status: "ACTIVE", userId: { not: null } },
          include: { user: { select: { email: true } } },
        }),
        db.companySettings.findFirst(),
        db.holiday.findMany({
          where: { date: { gte: period.startDate, lte: period.endDate } },
        }),
      ]);

      // Delete previous drafts for clean reprocessing
      await db.payslip.deleteMany({ where: { payPeriodId: periodId } });

      let processed = 0;
      let errorCount = 0;

      for (const emp of employees) {
        try {
          const attendance = await db.attendanceDaily.findMany({
            where: { employeeId: emp.id, workDate: { gte: period.startDate, lt: addDays(period.endDate, 1) } },
          });

          const presentDays = attendance.filter((a) => ["PRESENT", "LATE"].includes(a.status)).length;
          const paidLeaveDays = attendance.filter((a) => a.status === "ON_LEAVE").length;
          const absentDays = attendance.filter((a) => a.status === "ABSENT").length;

          const lateMinutes = attendance.reduce((s, a) => s + a.lateMinutes, 0);
          const undertimeMinutes = attendance.reduce((s, a) => s + a.undertimeMinutes, 0);
          const ndMinutes = attendance.reduce((s, a) => s + a.nightDiffMinutes, 0);

          const otRequests = await db.overtimeRequest.findMany({
            where: {
              employeeId: emp.id,
              status: "APPROVED",
              workDate: { gte: period.startDate, lt: addDays(period.endDate, 1) },
            },
          });
          const otHours = otRequests.reduce((s, r) => s + Number(r.approvedHours ?? 0), 0);

          // Holiday analysis
          let unworkedRegularHolidayDays = 0;
          let workedRegularHolidayDays = 0;
          let specialHolidaysWorkedDays = 0;
          const isRegularEmp = emp.employmentType === "REGULAR";

          for (const h of holidays) {
            const dayAtt = attendance.find(
              (a) => formatDateOnly(a.workDate) === formatDateOnly(h.date),
            );
            const worked = dayAtt && ["PRESENT", "LATE"].includes(dayAtt.status);
            if (h.type === "REGULAR" || h.type === "DOUBLE_HOLIDAY") {
              if (worked) workedRegularHolidayDays++;
              else if (isRegularEmp) unworkedRegularHolidayDays++;
            } else if ((h.type === "SPECIAL_NON_WORKING" || h.type === "SPECIAL_HOLIDAY") && worked) {
              specialHolidaysWorkedDays++;
            }
          }

          void absentDays;

          const monthlyRate = Number(emp.basicSalary);
          const result = computePayslip({
            monthlyRate,
            payFrequency: period.frequency as PayFrequencyCode,
            daysWorked: presentDays,
            paidLeaveDays,
            lateMinutes,
            undertimeMinutes,
            nightDiffMinutes: ndMinutes,
            approvedOvertimeHours: otHours,
            unworkedRegularHolidayDays,
            workedRegularHolidayDays,
            specialHolidaysWorkedDays,
            taxableEarnings: [],
            nonTaxableEarnings: [],
            deductions: [],
            thirteenthMonthYtd: 0,
            graceMinutes: settings?.graceMinutes ?? 5,
          });

          // 13th month YTD: basic earned this calendar year (incl. this run) / 12
          const yearStart = new Date(new Date(period.startDate).getFullYear(), 0, 1);
          const priorBasic = await db.payslip.aggregate({
            _sum: { basicPay: true },
            where: {
              employeeId: emp.id,
              payPeriod: { startDate: { gte: yearStart, lt: period.startDate }, status: { in: ["APPROVED", "PAID"] } },
            },
          });
          const ytd13th = compute13thMonth(Number(priorBasic._sum.basicPay ?? 0) + result.basicPay);

          await db.payslip.create({
            data: {
              payPeriodId: period.id,
              employeeId: emp.id,
              monthlyRate,
              dailyRate: result.dailyRate,
              hourlyRate: result.hourlyRate,
              daysWorked: presentDays + paidLeaveDays,
              basicPay: result.basicPay,
              nightDiffPay: result.nightDiffPay,
              overtimePay: result.overtimePay,
              holidayPay: result.holidayPay,
              grossPay: result.grossPay,
              lateAbsenceDeduction: result.lateAbsenceDeduction,
              sssContribution: result.sss,
              philhealthContribution: result.philhealth,
              pagibigContribution: result.pagibig,
              withholdingTax: result.withholdingTax,
              totalDeductions: result.totalDeductions,
              netPay: result.netPay,
              thirteenthMonthYTD: ytd13th,
            },
          });

          processed++;
        } catch {
          errorCount++;
        }
      }

      await recordAudit({
        action: "PROCESS_PAYROLL",
        entity: "PayPeriod",
        entityId: period.id,
        details: { processed, errorCount },
      });
    } finally {
      await db.payPeriod.update({
        where: { id: periodId },
        data: { status: "FOR_APPROVAL", processedBy: user.id, processedAt: new Date() },
      });
    }

    revalidatePath(`/payroll/${periodId}`);
    return {};
  }

  if (action === "APPROVE") {
    if (period.status !== "FOR_APPROVAL") return { error: "Only FOR_APPROVAL periods can be approved." };
    await db.payPeriod.update({
      where: { id: periodId },
      data: { status: "APPROVED", approvedBy: user.id },
    });
    await recordAudit({ action: "APPROVE_PAYROLL", entity: "PayPeriod", entityId: period.id });
    revalidatePath(`/payroll/${periodId}`);
    return {};
  }

  // MARK_PAID
  if (period.status !== "APPROVED") return { error: "Only APPROVED periods can be marked as paid." };
  await db.payPeriod.update({ where: { id: periodId }, data: { status: "PAID" } });
  await recordAudit({ action: "PAYROLL_MARKED_PAID", entity: "PayPeriod", entityId: period.id });
  revalidatePath(`/payroll/${periodId}`);
  return {};
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const idSchema = z.object({ periodId: z.string() });

export async function processPayrollAction(_prev: { error?: string }, formData: FormData) {
  const p = idSchema.safeParse({ periodId: String(formData.get("periodId") ?? "") });
  if (!p.success) return { error: "Missing period." };
  return setPeriodStatus(p.data.periodId, "PROCESS");
}

export async function approvePayrollAction(_prev: { error?: string }, formData: FormData) {
  const p = idSchema.safeParse({ periodId: String(formData.get("periodId") ?? "") });
  if (!p.success) return { error: "Missing period." };
  return setPeriodStatus(p.data.periodId, "APPROVE");
}

export async function markPaidAction(_prev: { error?: string }, formData: FormData) {
  const p = idSchema.safeParse({ periodId: String(formData.get("periodId") ?? "") });
  if (!p.success) return { error: "Missing period." };
  return setPeriodStatus(p.data.periodId, "MARK_PAID");
}

// ---- Custom adjustments on draft payslips ----

const adjSchema = z.object({
  payslipId: z.string(),
  type: z.enum(["EARNING", "DEDUCTION"]),
  label: z.string().min(1).max(100),
  amount: z.coerce.number().positive(),
});

export async function addAdjustmentAction(_prev: { error?: string }, formData: FormData) {
  await requireRole("ADMIN", "PAYROLL");

  const parsed = adjSchema.safeParse({
    payslipId: String(formData.get("payslipId") ?? ""),
    type: String(formData.get("type") ?? ""),
    label: String(formData.get("label") ?? "").trim(),
    amount: formData.get("amount"),
  });
  if (!parsed.success) return { error: "Check adjustment fields." };

  const payslip = await db.payslip.findUnique({ where: { id: parsed.data.payslipId }, include: { payPeriod: true } });
  if (!payslip) return { error: "Payslip not found." };
  if (!["DRAFT", "PROCESSING", "FOR_APPROVAL"].includes(payslip.payPeriod.status)) {
    return { error: "Adjustments are only allowed before approval." };
  }

  await db.$transaction(async (tx) => {
    await tx.payslipAdjustment.create({
      data: {
        payslipId: payslip.id,
        type: parsed.data.type,
        label: parsed.data.label,
        amount: parsed.data.amount,
        taxable: parsed.data.type === "EARNING",
      },
    });

    const adj = await tx.payslipAdjustment.findMany({ where: { payslipId: payslip.id } });
    const taxableExtra = round2(adj.filter((a) => a.taxable).reduce((s, a) => s + Number(a.amount), 0));
    const nonTaxableExtra = round2(adj.filter((a) => !a.taxable).reduce((s, a) => s + Number(a.amount), 0));

    const statutory = round2(
      Number(payslip.sssContribution) + Number(payslip.philhealthContribution) + Number(payslip.pagibigContribution),
    );

    // Recompute gross and tax including adjustments
    const baseTaxableGross = round2(Number(payslip.grossPay) - nonTaxableExtra); // stored gross included prior extras
    const newGross = round2(baseTaxableGross + taxableExtra + nonTaxableExtra);
    const taxableIncome = Math.max(
      0,
      round2(newGross - Number(payslip.lateAbsenceDeduction) - statutory),
    );

    const withholdingTax = computeWithholdingTax(taxableIncome, payslip.payPeriod.frequency as PayFrequencyCode);
    const totalDeductions = round2(statutory + withholdingTax);
    const netPay = round2(newGross - totalDeductions);

    await tx.payslip.update({
      where: { id: payslip.id },
      data: {
        grossPay: newGross,
        withholdingTax,
        totalDeductions,
        netPay,
      },
    });
  });

  await recordAudit({ action: "ADD_PAYSLIP_ADJUSTMENT", entity: "Payslip", entityId: parsed.data.payslipId, details: parsed.data });
  revalidatePath("/payroll");
  return {};
}

// ---- Process by Group ----

const processGroupSchema = z.object({
  periodId: z.string().min(1),
  groupId: z.string().min(1),
  siteId: z.string().min(1),
});

export async function processGroupAction(_prev: { error?: string; ok?: boolean }, formData: FormData) {
  try {
    await requireRole("ADMIN", "PAYROLL");
  } catch {
    throw new ForbiddenError();
  }

  const parsed = processGroupSchema.safeParse({
    periodId: String(formData.get("periodId") ?? ""),
    groupId: String(formData.get("groupId") ?? ""),
    siteId: String(formData.get("siteId") ?? ""),
  });
  if (!parsed.success) return { error: "All fields are required." };

  const period = await db.payPeriod.findUnique({ where: { id: parsed.data.periodId } });
  if (!period) return { error: "Pay period not found." };
  if (!["DRAFT", "PROCESSING"].includes(period.status)) {
    return { error: "Only DRAFT or PROCESSING periods can be processed." };
  }

  const group = await db.group.findUnique({ where: { id: parsed.data.groupId } });
  if (!group) return { error: "Group not found." };
  if (group.siteId !== parsed.data.siteId) return { error: "Group does not belong to the selected site." };

  // Check if this group+site was already processed
  const existing = await db.processedGroup.findUnique({
    where: { payPeriodId_groupId_siteId: { payPeriodId: parsed.data.periodId, groupId: parsed.data.groupId, siteId: parsed.data.siteId } },
  });
  if (existing) return { error: "This group has already been processed for this period." };

  // Set period to PROCESSING
  await db.payPeriod.update({ where: { id: period.id }, data: { status: "PROCESSING" } });

  // Find employees in this site + group
  const employees = await db.employee.findMany({
    where: { status: "ACTIVE", userId: { not: null }, siteId: parsed.data.siteId, groupId: parsed.data.groupId },
    include: { user: { select: { email: true } } },
  });

  if (employees.length === 0) {
    return { error: "No active employees found in this group at this site." };
  }

  const holidays = await db.holiday.findMany({
    where: { date: { gte: period.startDate, lte: period.endDate } },
  });

  let processed = 0;
  let errorCount = 0;

  for (const emp of employees) {
    try {
      const attendance = await db.attendanceDaily.findMany({
        where: { employeeId: emp.id, workDate: { gte: period.startDate, lt: addDays(period.endDate, 1) } },
      });

      const presentDays = attendance.filter((a) => ["PRESENT", "LATE"].includes(a.status)).length;
      const paidLeaveDays = attendance.filter((a) => a.status === "ON_LEAVE").length;
      const absentDays = attendance.filter((a) => a.status === "ABSENT").length;
      const lateMinutes = attendance.reduce((s, a) => s + a.lateMinutes, 0);
      const undertimeMinutes = attendance.reduce((s, a) => s + a.undertimeMinutes, 0);
      const ndMinutes = attendance.reduce((s, a) => s + a.nightDiffMinutes, 0);

      const otRequests = await db.overtimeRequest.findMany({
        where: {
          employeeId: emp.id,
          status: "APPROVED",
          workDate: { gte: period.startDate, lt: addDays(period.endDate, 1) },
        },
      });
      const otHours = otRequests.reduce((s, r) => s + Number(r.approvedHours ?? 0), 0);

      let unworkedRegularHolidayDays = 0;
      let workedRegularHolidayDays = 0;
      let specialHolidaysWorkedDays = 0;
      const isRegularEmp = emp.employmentType === "REGULAR";

      for (const h of holidays) {
        const dayAtt = attendance.find((a) => formatDateOnly(a.workDate) === formatDateOnly(h.date));
        const worked = dayAtt && ["PRESENT", "LATE"].includes(dayAtt.status);
        if (h.type === "REGULAR" || h.type === "DOUBLE_HOLIDAY") {
          if (worked) workedRegularHolidayDays++;
          else if (isRegularEmp) unworkedRegularHolidayDays++;
        } else if ((h.type === "SPECIAL_NON_WORKING" || h.type === "SPECIAL_HOLIDAY") && worked) {
          specialHolidaysWorkedDays++;
        }
      }

      void absentDays;

      const monthlyRate = Number(group.monthlyRate);
      const result = computePayslip({
        monthlyRate,
        payFrequency: group.payFrequency as PayFrequencyCode,
        daysWorked: presentDays,
        paidLeaveDays,
        lateMinutes,
        undertimeMinutes,
        nightDiffMinutes: ndMinutes,
        approvedOvertimeHours: otHours,
        unworkedRegularHolidayDays,
        workedRegularHolidayDays,
        specialHolidaysWorkedDays,
        taxableEarnings: [],
        nonTaxableEarnings: [],
        deductions: [],
        thirteenthMonthYtd: 0,
        graceMinutes: 5,
      });

      const yearStart = new Date(new Date(period.startDate).getFullYear(), 0, 1);
      const priorBasic = await db.payslip.aggregate({
        _sum: { basicPay: true },
        where: {
          employeeId: emp.id,
          payPeriod: { startDate: { gte: yearStart, lt: period.startDate }, status: { in: ["APPROVED", "PAID"] } },
        },
      });
      const ytd13th = compute13thMonth(Number(priorBasic._sum.basicPay ?? 0) + result.basicPay);

      // Upsert payslip (skip if already exists for this employee+period)
      await db.payslip.upsert({
        where: { payPeriodId_employeeId: { payPeriodId: period.id, employeeId: emp.id } },
        update: {
          monthlyRate,
          dailyRate: result.dailyRate,
          hourlyRate: result.hourlyRate,
          daysWorked: presentDays + paidLeaveDays,
          basicPay: result.basicPay,
          nightDiffPay: result.nightDiffPay,
          overtimePay: result.overtimePay,
          holidayPay: result.holidayPay,
          grossPay: result.grossPay,
          lateAbsenceDeduction: result.lateAbsenceDeduction,
          sssContribution: result.sss,
          philhealthContribution: result.philhealth,
          pagibigContribution: result.pagibig,
          withholdingTax: result.withholdingTax,
          totalDeductions: result.totalDeductions,
          netPay: result.netPay,
          thirteenthMonthYTD: ytd13th,
        },
        create: {
          payPeriodId: period.id,
          employeeId: emp.id,
          monthlyRate,
          dailyRate: result.dailyRate,
          hourlyRate: result.hourlyRate,
          daysWorked: presentDays + paidLeaveDays,
          basicPay: result.basicPay,
          nightDiffPay: result.nightDiffPay,
          overtimePay: result.overtimePay,
          holidayPay: result.holidayPay,
          grossPay: result.grossPay,
          lateAbsenceDeduction: result.lateAbsenceDeduction,
          sssContribution: result.sss,
          philhealthContribution: result.philhealth,
          pagibigContribution: result.pagibig,
          withholdingTax: result.withholdingTax,
          totalDeductions: result.totalDeductions,
          netPay: result.netPay,
          thirteenthMonthYTD: ytd13th,
        },
      });

      processed++;
    } catch {
      errorCount++;
    }
  }

  // Record that this group was processed
  await db.processedGroup.create({
    data: {
      payPeriodId: period.id,
      groupId: parsed.data.groupId,
      siteId: parsed.data.siteId,
      employeeCount: processed,
    },
  });

  await recordAudit({
    action: "PROCESS_GROUP_PAYROLL",
    entity: "PayPeriod",
    entityId: period.id,
    details: { groupId: parsed.data.groupId, siteId: parsed.data.siteId, group: group.name, processed, errorCount },
  });

  await db.payPeriod.update({
    where: { id: period.id },
    data: { status: "PROCESSING" },
  });

  revalidatePath(`/payroll/${period.id}`);
  revalidatePath("/payroll");
  return { ok: true };
}
