"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole, requireUser, verifyPassword, ForbiddenError } from "@/lib/auth";
import { recordAudit } from "@/lib/actions/audit";
import {
  computePayslip,
  compute13thMonth,
  computeWithholdingTax,
  round2,
  buildGovRateOverrides,
  type PayFrequencyCode,
  type GovRateOverrides,
} from "@/lib/payroll/ph";

const createPeriodSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  payDate: z.string(),
});

async function loadGovRates(year: number, frequency: string): Promise<GovRateOverrides> {
  const records = await db.govContributionTable.findMany({
    where: { isActive: true },
  });
  return buildGovRateOverrides(records, year, frequency);
}

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
    // Atomic status check — prevents concurrent processing
    const updated = await db.payPeriod.updateMany({
      where: { id: periodId, status: { in: ["DRAFT", "PROCESSING"] } },
      data: { status: "PROCESSING" },
    });
    if (updated.count === 0) {
      return { error: "Period is already being processed or is in a non-processable state." };
    }

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

      const year = new Date(period.startDate).getFullYear();
      const govRates = await loadGovRates(year, period.frequency);

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

          const empExceptions = await validateEmployeePayroll(
            emp,
            attendance.map((a) => ({
              status: a.status,
              actualIn: a.actualIn,
              actualOut: a.actualOut,
              workedMinutes: a.workedMinutes,
              lateMinutes: a.lateMinutes,
              undertimeMinutes: a.undertimeMinutes,
            })),
            period.startDate,
            period.endDate,
          );

          const monthlyRate = Number(emp.basicSalary);
          const result = computePayslip({
            monthlyRate,
            payFrequency: period.frequency as PayFrequencyCode,
            daysWorked: presentDays,
            paidLeaveDays,
            absentDays,
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
            govRates,
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
              lateAbsenceDeduction: round2(result.absenceDeduction + result.lateUndertimeDeduction),
              sssContribution: result.sss,
              philhealthContribution: result.philhealth,
              pagibigContribution: result.pagibig,
              withholdingTax: result.withholdingTax,
              totalDeductions: result.totalDeductions,
              netPay: result.netPay,
              thirteenthMonthYTD: ytd13th,
              breakdown: result.breakdown as unknown as Prisma.InputJsonValue,
            },
          });

          if (result.netPay < 0) {
            empExceptions.push({ employeeId: emp.id, type: "NEGATIVE_NET_PAY", severity: "ERROR", message: `Net pay is negative (₱${result.netPay.toFixed(2)}).` });
          }
          if (empExceptions.length > 0) {
            await db.payrollException.createMany({
              data: empExceptions.map((e) => ({
                payPeriodId: period.id,
                employeeId: e.employeeId,
                type: e.type,
                severity: e.severity,
                message: e.message,
              })),
            });
          }

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
    return { error: "Adjustments are only allowed before approval. Period is locked or already paid." };
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
      round2(newGross - statutory),
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
  let user;
  try {
    user = await requireRole("ADMIN", "PAYROLL");
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

  // Atomic check — try to create, catch duplicate
  try {
    await db.processedGroup.create({
      data: {
        payPeriodId: parsed.data.periodId,
        groupId: parsed.data.groupId,
        siteId: parsed.data.siteId,
        employeeCount: 0,
      },
    });
  } catch {
    return { error: "This group has already been processed for this period." };
  }

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

  const settings = await db.companySettings.findFirst();
  const year = new Date(period.startDate).getFullYear();
  const govRates = await loadGovRates(year, period.frequency);

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

      const monthlyRate = Number(emp.basicSalary);

      // Validate and save exceptions
      const empExceptions = await validateEmployeePayroll(
        emp,
        attendance.map((a) => ({
          status: a.status,
          actualIn: a.actualIn,
          actualOut: a.actualOut,
          workedMinutes: a.workedMinutes,
          lateMinutes: a.lateMinutes,
          undertimeMinutes: a.undertimeMinutes,
        })),
        period.startDate,
        period.endDate,
      );

      const result = computePayslip({
        monthlyRate,
        payFrequency: period.frequency as PayFrequencyCode,
        daysWorked: presentDays,
        paidLeaveDays,
        absentDays,
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
        govRates,
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
          lateAbsenceDeduction: round2(result.absenceDeduction + result.lateUndertimeDeduction),
          sssContribution: result.sss,
          philhealthContribution: result.philhealth,
          pagibigContribution: result.pagibig,
          withholdingTax: result.withholdingTax,
          totalDeductions: result.totalDeductions,
          netPay: result.netPay,
          thirteenthMonthYTD: ytd13th,
          breakdown: result.breakdown as unknown as Prisma.InputJsonValue,
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
          lateAbsenceDeduction: round2(result.absenceDeduction + result.lateUndertimeDeduction),
          sssContribution: result.sss,
          philhealthContribution: result.philhealth,
          pagibigContribution: result.pagibig,
          withholdingTax: result.withholdingTax,
          totalDeductions: result.totalDeductions,
          netPay: result.netPay,
          thirteenthMonthYTD: ytd13th,
          breakdown: result.breakdown as unknown as Prisma.InputJsonValue,
        },
      });

      // Check for negative net pay and save all exceptions
      if (result.netPay < 0) {
        empExceptions.push({ employeeId: emp.id, type: "NEGATIVE_NET_PAY", severity: "ERROR", message: `Net pay is negative (₱${result.netPay.toFixed(2)}).` });
      }
      if (empExceptions.length > 0) {
        await db.payrollException.createMany({
          data: empExceptions.map((e) => ({
            payPeriodId: period.id,
            employeeId: e.employeeId,
            type: e.type,
            severity: e.severity,
            message: e.message,
          })),
        });
      }

      processed++;
    } catch {
      errorCount++;
    }
  }

  // Update the processed group record with actual employee count
  await db.processedGroup.update({
    where: {
      payPeriodId_groupId_siteId: {
        payPeriodId: period.id,
        groupId: parsed.data.groupId,
        siteId: parsed.data.siteId,
      },
    },
    data: { employeeCount: processed },
  });

  await recordAudit({
    action: "PROCESS_GROUP_PAYROLL",
    entity: "PayPeriod",
    entityId: period.id,
    details: { groupId: parsed.data.groupId, siteId: parsed.data.siteId, group: group.name, processed, errorCount },
  });

  // Check if all groups at this site are now processed
  const totalGroups = await db.group.count({ where: { siteId: parsed.data.siteId, isActive: true } });
  const processedGroups = await db.processedGroup.count({
    where: { payPeriodId: period.id, siteId: parsed.data.siteId },
  });

  if (processedGroups >= totalGroups) {
    // All groups at this site processed — advance to FOR_APPROVAL
    await db.payPeriod.update({
      where: { id: period.id },
      data: { status: "FOR_APPROVAL", processedBy: user.id, processedAt: new Date() },
    });
  }

  revalidatePath(`/payroll/${period.id}`);
  revalidatePath("/payroll");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Payroll validation & preview
// ---------------------------------------------------------------------------

type ExceptionInput = {
  employeeId: string;
  type: "MISSING_TIME_OUT" | "MISSING_TIME_IN" | "DUPLICATE_ATTENDANCE" | "NO_SALARY" | "NO_SCHEDULE" | "MISSING_GOVT_IDS" | "NEGATIVE_NET_PAY" | "INCOMPLETE_ATTENDANCE" | "UNAPPROVED_OVERTIME";
  severity: "ERROR" | "WARNING";
  message: string;
};

type PayrollPreviewRow = {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  monthlyRate: number;
  dailyRate: number;
  hourlyRate: number;
  daysWorked: number;
  absentDays: number;
  paidLeaveDays: number;
  lateMinutes: number;
  undertimeMinutes: number;
  nightDiffMinutes: number;
  otHours: number;
  basicPay: number;
  nightDiffPay: number;
  overtimePay: number;
  holidayPay: number;
  absenceDeduction: number;
  lateUndertimeDeduction: number;
  grossPay: number;
  sss: number;
  philhealth: number;
  pagibig: number;
  withholdingTax: number;
  totalDeductions: number;
  netPay: number;
  exceptions: ExceptionInput[];
};

async function validateEmployeePayroll(
  emp: { id: string; basicSalary: unknown; sssNumber: string | null; philhealthNumber: string | null; pagibigNumber: string | null; tinNumber: string | null },
  attendance: Array<{ status: string; actualIn: Date | null; actualOut: Date | null; workedMinutes: number; lateMinutes: number; undertimeMinutes: number }>,
  periodStart: Date,
  periodEnd: Date,
): Promise<ExceptionInput[]> {
  const exceptions: ExceptionInput[] = [];
  const empId = emp.id;

  if (Number(emp.basicSalary) <= 0) {
    exceptions.push({ employeeId: empId, type: "NO_SALARY", severity: "ERROR", message: "Employee has no salary configured." });
  }

  if (!emp.sssNumber || !emp.philhealthNumber || !emp.pagibigNumber || !emp.tinNumber) {
    const missing = [
      !emp.sssNumber && "SSS",
      !emp.philhealthNumber && "PhilHealth",
      !emp.pagibigNumber && "Pag-IBIG",
      !emp.tinNumber && "TIN",
    ].filter(Boolean).join(", ");
    exceptions.push({ employeeId: empId, type: "MISSING_GOVT_IDS", severity: "WARNING", message: `Missing government IDs: ${missing}.` });
  }

  if (attendance.length === 0) {
    exceptions.push({ employeeId: empId, type: "NO_SCHEDULE", severity: "WARNING", message: "No attendance records found for this period." });
  }

  let hasMissingOut = false;
  let hasMissingIn = false;
  for (const a of attendance) {
    if (a.status === "INCOMPLETE") {
      if (!a.actualOut) hasMissingOut = true;
      if (!a.actualIn) hasMissingIn = true;
    }
  }

  if (hasMissingOut) {
    exceptions.push({ employeeId: empId, type: "MISSING_TIME_OUT", severity: "WARNING", message: "One or more shifts are missing a time-out punch." });
  }
  if (hasMissingIn) {
    exceptions.push({ employeeId: empId, type: "MISSING_TIME_IN", severity: "WARNING", message: "One or more shifts are missing a time-in punch." });
  }

  return exceptions;
}

export async function previewPayrollAction(
  periodId: string,
  siteId: string,
  groupId: string,
): Promise<{ rows: PayrollPreviewRow[]; exceptions: ExceptionInput[]; error?: string }> {
  try {
    await requireRole("ADMIN", "PAYROLL");
  } catch {
    throw new ForbiddenError();
  }

  const period = await db.payPeriod.findUnique({ where: { id: periodId } });
  if (!period) return { rows: [], exceptions: [], error: "Period not found." };

  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group) return { rows: [], exceptions: [], error: "Group not found." };

  const employees = await db.employee.findMany({
    where: { status: "ACTIVE", userId: { not: null }, siteId, groupId },
  });

  if (employees.length === 0) return { rows: [], exceptions: [], error: "No active employees found." };

  const holidays = await db.holiday.findMany({
    where: { date: { gte: period.startDate, lte: period.endDate } },
  });

  const settings = await db.companySettings.findFirst();
  const year = new Date(period.startDate).getFullYear();
  const govRates = await loadGovRates(year, period.frequency);

  const allExceptions: ExceptionInput[] = [];
  const rows: PayrollPreviewRow[] = [];

  for (const emp of employees) {
    const empExceptions: ExceptionInput[] = [];

    const attendance = await db.attendanceDaily.findMany({
      where: { employeeId: emp.id, workDate: { gte: period.startDate, lt: addDays(period.endDate, 1) } },
    });

    // Validate
    const validationExcs = await validateEmployeePayroll(
      emp,
      attendance.map((a) => ({
        status: a.status,
        actualIn: a.actualIn,
        actualOut: a.actualOut,
        workedMinutes: a.workedMinutes,
        lateMinutes: a.lateMinutes,
        undertimeMinutes: a.undertimeMinutes,
      })),
      period.startDate,
      period.endDate,
    );
    empExceptions.push(...validationExcs);

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

    const monthlyRate = Number(emp.basicSalary);
    const result = computePayslip({
      monthlyRate,
      payFrequency: period.frequency as PayFrequencyCode,
      daysWorked: presentDays,
      paidLeaveDays,
      absentDays,
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
      govRates,
    });

    if (result.netPay < 0) {
      empExceptions.push({ employeeId: emp.id, type: "NEGATIVE_NET_PAY", severity: "ERROR", message: `Net pay is negative (₱${result.netPay.toFixed(2)}). Check deductions.` });
    }

    allExceptions.push(...empExceptions);

    const empRecord = await db.employee.findUnique({
      where: { id: emp.id },
      select: { employeeNumber: true, firstName: true, lastName: true, middleName: true, suffix: true },
    });

    rows.push({
      employeeId: emp.id,
      employeeNumber: empRecord?.employeeNumber ?? "—",
      employeeName: empRecord
        ? [empRecord.firstName, empRecord.middleName ? `${empRecord.middleName[0]}.` : null, empRecord.lastName, empRecord.suffix].filter(Boolean).join(" ")
        : "—",
      monthlyRate,
      dailyRate: result.dailyRate,
      hourlyRate: result.hourlyRate,
      daysWorked: presentDays,
      absentDays,
      paidLeaveDays,
      lateMinutes,
      undertimeMinutes,
      nightDiffMinutes: ndMinutes,
      otHours,
      basicPay: result.basicPay,
      nightDiffPay: result.nightDiffPay,
      overtimePay: result.overtimePay,
      holidayPay: result.holidayPay,
      absenceDeduction: result.absenceDeduction,
      lateUndertimeDeduction: result.lateUndertimeDeduction,
      grossPay: result.grossPay,
      sss: result.sss,
      philhealth: result.philhealth,
      pagibig: result.pagibig,
      withholdingTax: result.withholdingTax,
      totalDeductions: result.totalDeductions,
      netPay: result.netPay,
      exceptions: empExceptions,
    });
  }

  return { rows, exceptions: allExceptions };
}

export async function getPayrollExceptionsAction(periodId: string) {
  await requireRole("ADMIN", "PAYROLL", "HR");

  return db.payrollException.findMany({
    where: { payPeriodId: periodId },
    include: {
      employee: {
        select: { employeeNumber: true, firstName: true, lastName: true },
      },
    },
    orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
  });
}

export async function resolveExceptionAction(exceptionId: string) {
  const user = await requireRole("ADMIN", "PAYROLL");
  const exception = await db.payrollException.findUnique({ where: { id: exceptionId } });
  if (!exception) return { ok: false, error: "Exception not found" };

  await db.payrollException.update({
    where: { id: exceptionId },
    data: { resolved: true, resolvedById: user.id, resolvedAt: new Date() },
  });

  await recordAudit({ action: "RESOLVE_PAYROLL_EXCEPTION", entity: "PayrollException", entityId: exceptionId, details: { type: exception.type, employeeId: exception.employeeId } });

  return { ok: true };
}

export async function lockPayPeriodAction(periodId: string) {
  const user = await requireRole("ADMIN", "PAYROLL");
  const period = await db.payPeriod.findUnique({ where: { id: periodId } });
  if (!period) return { error: "Pay period not found" };
  if (!["APPROVED", "PAID"].includes(period.status)) return { error: "Only approved or paid periods can be locked" };

  await db.payPeriod.update({
    where: { id: periodId },
    data: { status: "LOCKED", lockedBy: user.id, lockedAt: new Date() },
  });

  await recordAudit({ action: "LOCK_PAYROLL", entity: "PayPeriod", entityId: periodId });
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${periodId}`);
  return { ok: true };
}

export async function unlockPayPeriodAction(periodId: string) {
  const user = await requireRole("ADMIN", "PAYROLL");
  const period = await db.payPeriod.findUnique({ where: { id: periodId } });
  if (!period) return { error: "Pay period not found" };
  if (period.status !== "LOCKED") return { error: "Period is not locked" };

  await db.payPeriod.update({
    where: { id: periodId },
    data: { status: "APPROVED", lockedBy: null, lockedAt: null },
  });

  await recordAudit({ action: "UNLOCK_PAYROLL", entity: "PayPeriod", entityId: periodId });
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${periodId}`);
  return { ok: true };
}

export async function archivePayPeriodAction(periodId: string) {
  const user = await requireRole("ADMIN", "PAYROLL");
  const period = await db.payPeriod.findUnique({ where: { id: periodId } });
  if (!period) return { error: "Pay period not found" };
  if (!["DRAFT", "FOR_APPROVAL"].includes(period.status)) return { error: "Only draft or pending approval periods can be archived" };

  await db.payPeriod.update({
    where: { id: periodId },
    data: { archivedAt: new Date() },
  });

  await recordAudit({ action: "ARCHIVE_PAYROLL", entity: "PayPeriod", entityId: periodId });
  revalidatePath("/payroll");
  return { ok: true };
}

export async function deletePayPeriodAction(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const user = await requireRole("ADMIN", "PAYROLL");
  const periodId = String(formData.get("periodId") ?? "");
  const password = String(formData.get("password") ?? "");

  const period = await db.payPeriod.findUnique({ where: { id: periodId } });
  if (!period) return { error: "Pay period not found" };

  const needsPassword = ["APPROVED", "PAID", "LOCKED"].includes(period.status);
  if (needsPassword) {
    if (!password) return { error: "Password is required to delete paid periods" };
    const fullUser = await db.user.findUnique({ where: { id: user.id } });
    if (!fullUser || !(await verifyPassword(password, fullUser.passwordHash))) {
      return { error: "Incorrect password" };
    }
  }

  await db.$transaction([
    db.payslipAdjustment.deleteMany({ where: { payslip: { payPeriodId: periodId } } }),
    db.payslip.deleteMany({ where: { payPeriodId: periodId } }),
    db.payrollException.deleteMany({ where: { payPeriodId: periodId } }),
    db.processedGroup.deleteMany({ where: { payPeriodId: periodId } }),
    db.payPeriod.delete({ where: { id: periodId } }),
  ]);

  await recordAudit({ action: "DELETE_PAYROLL", entity: "PayPeriod", entityId: periodId });
  revalidatePath("/payroll");
  return {};
}

export async function unarchivePayPeriodAction(periodId: string) {
  const user = await requireRole("ADMIN", "PAYROLL");
  const period = await db.payPeriod.findUnique({ where: { id: periodId } });
  if (!period) return { error: "Pay period not found" };
  if (!period.archivedAt) return { error: "Period is not archived" };

  await db.payPeriod.update({
    where: { id: periodId },
    data: { archivedAt: null },
  });

  await recordAudit({ action: "UNARCHIVE_PAYROLL", entity: "PayPeriod", entityId: periodId });
  revalidatePath("/payroll");
  revalidatePath("/payroll/archived");
  return { ok: true };
}
