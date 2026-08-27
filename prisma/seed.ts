import "dotenv/config";
import { createHash } from "crypto";
import { PrismaClient, PayFrequency, HolidayType, AttendanceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function randomMinutes(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function isWeekend(d: Date) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

async function main() {
  console.log("Clearing old data...");
  await db.payslip.deleteMany();
  await db.payPeriod.deleteMany();
  await db.shiftAssignment.deleteMany();
  await db.timeLog.deleteMany();
  await db.attendanceDaily.deleteMany();
  await db.employee.deleteMany();
  await db.user.deleteMany({ where: { role: "EMPLOYEE" } });
  console.log("Old data cleared.");

  console.log("Seeding HRIS...");

  // ---------- Company settings ----------
  const existingSettings = await db.companySettings.findFirst();
  if (existingSettings) {
    await db.companySettings.update({
      where: { id: existingSettings.id },
      data: { name: "BPO Company", city: "Tacloban City", timezone: "Asia/Manila", payFrequency: "WEEKLY" },
    });
  } else {
    await db.companySettings.create({
      data: {
        name: "BPO Company",
        tagline: "Delivering excellence, one conversation at a time.",
        city: "Tacloban City",
        timezone: "Asia/Manila",
        payFrequency: "WEEKLY",
      },
    });
  }

  // ---------- Users ----------
  const superHash = await bcrypt.hash("Super@12345", 12);
  const adminHash = await bcrypt.hash("Admin@12345", 12);
  const hrHash = await bcrypt.hash("Hr@123456", 12);
  const payrollHash = await bcrypt.hash("Payroll@12345", 12);

  const admin = await db.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: { email: "admin@company.com", passwordHash: adminHash, role: "ADMIN" },
  });
  await db.user.upsert({ where: { email: "superadmin@company.com" }, update: {}, create: { email: "superadmin@company.com", passwordHash: superHash, role: "SUPER_ADMIN" } });
  await db.user.upsert({ where: { email: "hr@company.com" }, update: {}, create: { email: "hr@company.com", passwordHash: hrHash, role: "HR" } });
  await db.user.upsert({ where: { email: "payroll@company.com" }, update: {}, create: { email: "payroll@company.com", passwordHash: payrollHash, role: "PAYROLL" } });

  // ---------- Leave types ----------
  const leaveTypes = [
    { code: "VL", name: "Vacation Leave", annualQuota: 15, carryOver: true },
    { code: "SL", name: "Sick Leave", annualQuota: 15, carryOver: true, requiresMedicalCert: true },
    { code: "EL", name: "Emergency Leave", annualQuota: 3, carryOver: false },
    { code: "SPL", name: "Special Privilege Leave", annualQuota: 3, carryOver: false },
    { code: "ML", name: "Maternity Leave", annualQuota: 105, carryOver: false },
    { code: "PL", name: "Paternity Leave", annualQuota: 7, carryOver: false },
    { code: "BL", name: "Bereavement Leave", annualQuota: 5, carryOver: false },
  ];
  for (const lt of leaveTypes) {
    await db.leaveType.upsert({ where: { code: lt.code }, update: {}, create: lt });
  }

  // ---------- Shift templates ----------
  const shiftData = [
    { name: "Morning (8AM-5PM)", startTime: "08:00", endTime: "17:00", isNightShift: false, color: "#f59e0b" },
    { name: "Mid Shift (3PM-12MN)", startTime: "15:00", endTime: "00:00", isNightShift: true, color: "#8b5cf6" },
    { name: "Graveyard (10PM-7AM)", startTime: "22:00", endTime: "07:00", isNightShift: true, color: "#3b82f6" },
    { name: "Graveyard (11PM-8AM)", startTime: "23:00", endTime: "08:00", isNightShift: true, color: "#06b6d4" },
    { name: "Graveyard (8PM-6AM)", startTime: "20:00", endTime: "06:00", isNightShift: true, color: "#6366f1" },
  ];
  for (const s of shiftData) {
    await db.shiftTemplate.upsert({ where: { name: s.name }, update: {}, create: s });
  }
  const graveyardShift = await db.shiftTemplate.findUnique({ where: { name: "Graveyard (8PM-6AM)" } });

  // ---------- Government contribution tables ----------
  await db.govContributionTable.upsert({
    where: { type_effectiveYear_frequency: { type: "SSS", effectiveYear: 2025, frequency: "MONTHLY" } },
    update: { brackets: SSS_2025 as never },
    create: { type: "SSS", effectiveYear: 2025, frequency: "MONTHLY", brackets: SSS_2025 as never },
  });
  await db.govContributionTable.upsert({
    where: { type_effectiveYear_frequency: { type: "PHILHEALTH", effectiveYear: 2025, frequency: "MONTHLY" } },
    update: { brackets: PHILHEALTH_2025 as never },
    create: { type: "PHILHEALTH", effectiveYear: 2025, frequency: "MONTHLY", brackets: PHILHEALTH_2025 as never },
  });
  await db.govContributionTable.upsert({
    where: { type_effectiveYear_frequency: { type: "PAGIBIG", effectiveYear: 2025, frequency: "MONTHLY" } },
    update: { brackets: PAGIBIG_2025 as never },
    create: { type: "PAGIBIG", effectiveYear: 2025, frequency: "MONTHLY", brackets: PAGIBIG_2025 as never },
  });
  await db.govContributionTable.upsert({
    where: { type_effectiveYear_frequency: { type: "WITHHOLDING_TAX", effectiveYear: 2023, frequency: "MONTHLY" } },
    update: { brackets: BIR_TRAIN_MONTHLY as never },
    create: { type: "WITHHOLDING_TAX", effectiveYear: 2023, frequency: "MONTHLY", brackets: BIR_TRAIN_MONTHLY as never },
  });

  // ---------- Org structure ----------
  const site = await db.site.upsert({ where: { name: "Tacloban Main Site" }, update: {}, create: { name: "Tacloban Main Site", address: "Tacloban City, Leyte" } });
  const ops = await db.department.upsert({ where: { name: "Operations" }, update: {}, create: { name: "Operations" } });
  const fin = await db.department.upsert({ where: { name: "Finance" }, update: {}, create: { name: "Finance" } });
  const campaign = await db.campaign.upsert({ where: { name: "Acme Voice Support" }, update: {}, create: { name: "Acme Voice Support", clientName: "Acme Corp." } });
  const csrPos = await db.position.upsert({ where: { title: "Customer Service Representative" }, update: {}, create: { title: "Customer Service Representative", level: 1 } });
  const seniorPos = await db.position.upsert({ where: { title: "Senior Customer Service Representative" }, update: {}, create: { title: "Senior Customer Service Representative", level: 2 } });
  const leadPos = await db.position.upsert({ where: { title: "Team Lead" }, update: {}, create: { title: "Team Lead", level: 3 } });

  // ---------- Payroll Groups ----------
  // Clean up old groups with null siteId (from before siteId was added)
  await db.group.deleteMany({ where: { siteId: null } });

  const groupA = await db.group.upsert({
    where: { name_siteId: { name: "Group A - CSR", siteId: site.id } },
    update: {},
    create: {
      name: "Group A - CSR",
      siteId: site.id,
      description: "Standard CSR team — weekly pay, basic allowances",
      monthlyRate: 21000,
      payFrequency: "WEEKLY",
      nightDiffRate: 0.10,
      riceAllowance: 1500,
      transpoAllowance: 500,
      otherAllowance: 0,
    },
  });
  const groupB = await db.group.upsert({
    where: { name_siteId: { name: "Group B - Senior CSR", siteId: site.id } },
    update: {},
    create: {
      name: "Group B - Senior CSR",
      siteId: site.id,
      description: "Senior CSR team — weekly pay, higher rate + allowances",
      monthlyRate: 23000,
      payFrequency: "WEEKLY",
      nightDiffRate: 0.12,
      riceAllowance: 1500,
      transpoAllowance: 1000,
      otherAllowance: 500,
    },
  });
  const groupC = await db.group.upsert({
    where: { name_siteId: { name: "Group C - Leadership", siteId: site.id } },
    update: {},
    create: {
      name: "Group C - Leadership",
      siteId: site.id,
      description: "Team Leads and managers — semi-monthly pay",
      monthlyRate: 32000,
      payFrequency: "SEMI_MONTHLY",
      nightDiffRate: 0.15,
      riceAllowance: 2000,
      transpoAllowance: 1500,
      otherAllowance: 1000,
    },
  });

  // ---------- 20 Employees ----------
  const empDefs = [
    { num: "EMP0001", first: "Juan", last: "Dela Cruz", salary: 32000, posId: leadPos.id, groupId: groupC.id },
    { num: "EMP0002", first: "Maria", last: "Santos", salary: 21000, posId: csrPos.id, groupId: groupA.id },
    { num: "EMP0003", first: "Pedro", last: "Ramos", salary: 21000, posId: csrPos.id, groupId: groupA.id },
    { num: "EMP0004", first: "Ana", last: "Garcia", salary: 21000, posId: csrPos.id, groupId: groupA.id },
    { num: "EMP0005", first: "Jose", last: "Reyes", salary: 21000, posId: csrPos.id, groupId: groupA.id },
    { num: "EMP0006", first: "Rose", last: "Torres", salary: 21000, posId: csrPos.id, groupId: groupA.id },
    { num: "EMP0007", first: "Mark", last: "Lim", salary: 23000, posId: seniorPos.id, groupId: groupB.id },
    { num: "EMP0008", first: "Joy", last: "Mendoza", salary: 21000, posId: csrPos.id, groupId: groupA.id },
    { num: "EMP0009", first: "Carlo", last: "Rivera", salary: 21000, posId: csrPos.id, groupId: groupA.id },
    { num: "EMP0010", first: "Lea", last: "Flores", salary: 21000, posId: csrPos.id, groupId: groupA.id },
    { num: "EMP0011", first: "Angelo", last: "Cruz", salary: 21000, posId: csrPos.id, groupId: groupA.id },
    { num: "EMP0012", first: "Patricia", last: "Villanueva", salary: 23000, posId: seniorPos.id, groupId: groupB.id },
    { num: "EMP0013", first: "Rafael", last: "Gonzales", salary: 21000, posId: csrPos.id, groupId: groupA.id },
    { num: "EMP0014", first: "Cherry", last: "Pascual", salary: 21000, posId: csrPos.id, groupId: groupA.id },
    { num: "EMP0015", first: "Daniel", last: "Soriano", salary: 21000, posId: csrPos.id, groupId: groupA.id },
    { num: "EMP0016", first: "Mia", last: "Aquino", salary: 21000, posId: csrPos.id, groupId: groupA.id },
    { num: "EMP0017", first: "Patrick", last: "De Leon", salary: 21000, posId: csrPos.id, groupId: groupA.id },
    { num: "EMP0018", first: "Sheila", last: "Morales", salary: 21000, posId: csrPos.id, groupId: groupA.id },
    { num: "EMP0019", first: "Kevin", last: "Bautista", salary: 21000, posId: csrPos.id, groupId: groupA.id },
    { num: "EMP0020", first: "Nicole", last: "Hernandez", salary: 21000, posId: csrPos.id, groupId: groupA.id },
  ];

  const empHash = await bcrypt.hash("Employee@123", 12);
  const createdEmployees: { id: string; employeeNumber: string; firstName: string; lastName: string; basicSalary: number }[] = [];

  for (const e of empDefs) {
    const email = `${e.first.toLowerCase()}.${e.last.toLowerCase()}@company.com`;
    const user = await db.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash: empHash, role: "EMPLOYEE" },
    });
    const pin = `123${e.num.slice(-2)}0`;
    const dailyRate = Math.round(((e.salary * 12) / 313) * 100) / 100;
    const emp = await db.employee.upsert({
      where: { employeeNumber: e.num },
      update: {},
      create: {
        employeeNumber: e.num,
        userId: user.id,
        firstName: e.first,
        lastName: e.last,
        hireDate: new Date("2025-01-15"),
        employmentType: "REGULAR",
        basicSalary: e.salary,
        dailyRate,
        siteId: site.id,
        departmentId: ops.id,
        campaignId: campaign.id,
        positionId: e.posId,
        groupId: e.groupId,
        bundyPinHash: sha256(pin),
        bundyPinSetAt: new Date(),
        sssNumber: `34-${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}-0`,
        tinNumber: `123-456-${Math.floor(100 + Math.random() * 900)}-000`,
      },
    });
    createdEmployees.push({ id: emp.id, employeeNumber: e.num, firstName: e.first, lastName: e.last, basicSalary: e.salary });
  }

  // Link admin
  const adminEmp = await db.employee.findUnique({ where: { employeeNumber: "ADM0001" } });
  if (!adminEmp) {
    await db.employee.create({
      data: {
        employeeNumber: "ADM0001",
        userId: admin.id,
        firstName: "System",
        lastName: "Administrator",
        hireDate: new Date(),
        employmentType: "REGULAR",
        basicSalary: 60000,
        departmentId: fin.id,
        positionId: leadPos.id,
      },
    });
  }

  // ---------- Holidays ----------
  const year = 2026;
  const holidayDefs = [
    { date: `${year}-01-01`, name: "New Year's Day", type: HolidayType.REGULAR },
    { date: `${year}-04-09`, name: "Araw ng Kagitingan", type: HolidayType.REGULAR },
    { date: `${year}-05-01`, name: "Labor Day", type: HolidayType.REGULAR },
    { date: `${year}-06-12`, name: "Independence Day", type: HolidayType.REGULAR },
    { date: `${year}-08-30`, name: "National Heroes Day", type: HolidayType.REGULAR },
    { date: `${year}-11-30`, name: "Bonifacio Day", type: HolidayType.REGULAR },
    { date: `${year}-12-25`, name: "Christmas Day", type: HolidayType.REGULAR },
    { date: `${year}-12-30`, name: "Rizal Day", type: HolidayType.REGULAR },
  ];
  for (const h of holidayDefs) {
    await db.holiday.upsert({
      where: { date: new Date(`${h.date}T00:00:00`) },
      update: {},
      create: { ...h, date: new Date(`${h.date}T00:00:00`) },
    });
  }

  // ---------- Generate attendance: Aug 1 – Aug 27, 2026 ----------
  const startDate = new Date("2026-08-01T00:00:00");
  const endDate = new Date("2026-08-27T00:00:00");
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  console.log("Generating attendance data...");

  // Pre-generate workdays list
  const workdays: Date[] = [];
  for (let d = 0; d <= totalDays; d++) {
    const wd = addDays(startDate, d);
    if (!isWeekend(wd)) workdays.push(wd);
  }
  console.log(`  ${workdays.length} workdays to generate for ${createdEmployees.length} employees`);

  // Batch insert time logs and attendance daily
  const timeLogBatch: Array<{
    employeeId: string; type: "IN" | "OUT"; timestamp: Date; workDate: Date; source: string;
  }> = [];
  const attendanceBatch: Array<{
    employeeId: string; workDate: Date; scheduledStart: string; scheduledEnd: string;
    actualIn?: Date; actualOut?: Date; lateMinutes: number; workedMinutes: number;
    nightDiffMinutes: number; status: AttendanceStatus;
  }> = [];

  for (const emp of createdEmployees) {
    for (const workDate of workdays) {
      const isPresent = Math.random() > 0.08; // 92% attendance

      if (isPresent) {
        const isLate = Math.random() < 0.12;
        const arrivalMinutes = isLate ? randomMinutes(10, 40) : randomMinutes(-5, 5);
        const actualIn = new Date(workDate);
        actualIn.setHours(20, arrivalMinutes > 0 ? arrivalMinutes : 0, 0, 0);

        const departMinutes = randomMinutes(-5, 10);
        const actualOut = addDays(workDate, 1);
        actualOut.setHours(6, departMinutes > 0 ? departMinutes : 0, 0, 0);

        const lateMinutes = isLate ? arrivalMinutes : 0;
        const workedMinutes = Math.round((actualOut.getTime() - actualIn.getTime()) / 60000);
        const nightDiffMinutes = Math.max(0, workedMinutes - 60);

        timeLogBatch.push({ employeeId: emp.id, type: "IN", timestamp: actualIn, workDate, source: "WEB" });
        timeLogBatch.push({ employeeId: emp.id, type: "OUT", timestamp: actualOut, workDate, source: "WEB" });

        attendanceBatch.push({
          employeeId: emp.id, workDate, scheduledStart: "20:00", scheduledEnd: "06:00",
          actualIn, actualOut, lateMinutes, workedMinutes, nightDiffMinutes,
          status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
        });
      } else {
        attendanceBatch.push({
          employeeId: emp.id, workDate, scheduledStart: "20:00", scheduledEnd: "06:00",
          lateMinutes: 0, workedMinutes: 0, nightDiffMinutes: 0, status: AttendanceStatus.ABSENT,
        });
      }
    }
  }

  // Insert in chunks of 500
  const chunk = 500;
  for (let i = 0; i < timeLogBatch.length; i += chunk) {
    await db.timeLog.createMany({ data: timeLogBatch.slice(i, i + chunk) });
    console.log(`  TimeLogs: ${Math.min(i + chunk, timeLogBatch.length)}/${timeLogBatch.length}`);
  }
  for (let i = 0; i < attendanceBatch.length; i += chunk) {
    await db.attendanceDaily.createMany({ data: attendanceBatch.slice(i, i + chunk) });
    console.log(`  Attendance: ${Math.min(i + chunk, attendanceBatch.length)}/${attendanceBatch.length}`);
  }

  // ---------- Shift assignments (batch) ----------
  console.log("Creating shift assignments...");
  const shiftBatch: Array<{
    employeeId: string; shiftTemplateId: string; date: Date; customStart: string; customEnd: string;
  }> = [];
  for (const emp of createdEmployees) {
    for (const wd of workdays) {
      shiftBatch.push({
        employeeId: emp.id,
        shiftTemplateId: graveyardShift!.id,
        date: wd,
        customStart: "20:00",
        customEnd: "06:00",
      });
    }
  }
  for (let i = 0; i < shiftBatch.length; i += chunk) {
    await db.shiftAssignment.createMany({ data: shiftBatch.slice(i, i + chunk) });
    console.log(`  Shifts: ${Math.min(i + chunk, shiftBatch.length)}/${shiftBatch.length}`);
  }

  // ---------- Weekly Pay Periods & Payslips ----------
  console.log("Creating pay periods and payslips...");
  const payWeeks = [
    { start: "2026-08-01", end: "2026-08-07", payDate: "2026-08-10" },
    { start: "2026-08-08", end: "2026-08-14", payDate: "2026-08-17" },
    { start: "2026-08-15", end: "2026-08-21", payDate: "2026-08-24" },
    { start: "2026-08-22", end: "2026-08-28", payDate: "2026-08-31" },
  ];

  const payslipBatch: Array<{
    payPeriodId: string; employeeId: string; monthlyRate: number; dailyRate: number; hourlyRate: number;
    daysWorked: number; basicPay: number; nightDiffPay: number; overtimePay: number; holidayPay: number;
    grossPay: number; lateAbsenceDeduction: number; sssContribution: number; philhealthContribution: number;
    pagibigContribution: number; withholdingTax: number; totalDeductions: number; netPay: number;
    thirteenthMonthYTD: number;
  }> = [];

  for (const week of payWeeks) {
    const period = await db.payPeriod.create({
      data: {
        frequency: "WEEKLY",
        startDate: new Date(`${week.start}T00:00:00`),
        endDate: new Date(`${week.end}T00:00:00`),
        payDate: new Date(`${week.payDate}T00:00:00`),
        status: new Date(week.payDate) <= endDate ? "PAID" : "DRAFT",
      },
    });

    for (const emp of createdEmployees) {
      const monthRate = emp.basicSalary;
      const dailyRate = Math.round((monthRate * 12) / 313 * 100) / 100;
      const hourlyRate = Math.round((dailyRate / 8) * 100) / 100;

      const recs = attendanceBatch.filter(
        (a) =>
          a.employeeId === emp.id &&
          a.workDate >= new Date(`${week.start}T00:00:00`) &&
          a.workDate <= new Date(`${week.end}T23:59:59`)
      );

      const daysWorked = recs.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
      const totalLate = recs.reduce((s, a) => s + a.lateMinutes, 0);
      const totalNightDiff = recs.reduce((s, a) => s + a.nightDiffMinutes, 0);

      const basicPay = Math.round(daysWorked * dailyRate * 100) / 100;
      const nightDiffPay = Math.round((totalNightDiff / 60) * hourlyRate * 0.10 * 100) / 100;
      const lateDeduction = Math.round((totalLate / 60) * hourlyRate * 100) / 100;
      const grossPay = Math.round((basicPay + nightDiffPay - lateDeduction) * 100) / 100;

      const sss = Math.round((monthRate * 0.05) / 4 * 100) / 100;
      const philhealth = Math.round((monthRate * 0.0225) / 4 * 100) / 100;
      const pagibig = Math.min(25, Math.round((monthRate * 0.02) / 4 * 100) / 100);
      const weeklyTaxableThreshold = 20833 / 4;
      const tax = grossPay > weeklyTaxableThreshold ? Math.round((grossPay - weeklyTaxableThreshold) * 0.15 * 100) / 100 : 0;
      const totalDeductions = Math.round((sss + philhealth + pagibig + tax) * 100) / 100;
      const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

      payslipBatch.push({
        payPeriodId: period.id, employeeId: emp.id, monthlyRate: monthRate, dailyRate, hourlyRate,
        daysWorked, basicPay, nightDiffPay, overtimePay: 0, holidayPay: 0,
        grossPay, lateAbsenceDeduction: lateDeduction, sssContribution: sss,
        philhealthContribution: philhealth, pagibigContribution: pagibig,
        withholdingTax: tax, totalDeductions, netPay, thirteenthMonthYTD: 0,
      });
    }
  }

  for (let i = 0; i < payslipBatch.length; i += chunk) {
    await db.payslip.createMany({ data: payslipBatch.slice(i, i + chunk) });
    console.log(`  Payslips: ${Math.min(i + chunk, payslipBatch.length)}/${payslipBatch.length}`);
  }

  console.log("\n✅ Seed complete!");
  console.log("─────────────────────────────────────────");
  console.log("Login accounts:");
  console.log("  Super:   superadmin@company.com / Super@12345");
  console.log("  Admin:   admin@company.com     / Admin@12345");
  console.log("  HR:      hr@company.com        / Hr@123456");
  console.log("  Payroll: payroll@company.com   / Payroll@12345");
  console.log("─────────────────────────────────────────");
  console.log(`Employees: ${createdEmployees.length} (Graveyard 8PM-6AM)`);
  console.log(`Workdays: ${workdays.length} (Aug 1 – Aug 27, Mon-Fri)`);
  console.log(`TimeLogs: ${timeLogBatch.length}`);
  console.log(`Attendance: ${attendanceBatch.length}`);
  console.log(`Shifts: ${shiftBatch.length}`);
  console.log(`Pay periods: 4 weeks | Payslips: ${payslipBatch.length}`);
  console.log("─────────────────────────────────────────");
}

const SSS_2025 = { minMsc: 5000, maxMsc: 35000, eeRate: 0.05, erRate: 0.095, ecRate: 0.005 };
const PHILHEALTH_2025 = { rate: 0.05, floor: 10000, ceiling: 100000 };
const PAGIBIG_2025 = { rate: 0.02, cap: 100, threshold: 1500 };
const BIR_TRAIN_MONTHLY = [
  { min: 0, max: 20833, base: 0, rate: 0 },
  { min: 20833, max: 33332, base: 0, rate: 0.15 },
  { min: 33333, max: 66666, base: 1875, rate: 0.2 },
  { min: 66667, max: 166666, base: 8541.8, rate: 0.25 },
  { min: 166667, max: 666666, base: 33541.8, rate: 0.3 },
  { min: 666667, base: 183541.8, rate: 0.35 },
];

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
