import "dotenv/config";
import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function main() {
  console.log("Seeding HRIS…");

  // ---------- Company settings ----------
  const existingSettings = await db.companySettings.findFirst();
  if (existingSettings) {
    await db.companySettings.update({
      where: { id: existingSettings.id },
      data: { name: "BPO Company", city: "Tacloban City", timezone: "Asia/Manila", payFrequency: "SEMI_MONTHLY" },
    });
  } else {
    await db.companySettings.create({
      data: {
        name: "BPO Company",
        tagline: "Delivering excellence, one conversation at a time.",
        city: "Tacloban City",
        timezone: "Asia/Manila",
        payFrequency: "SEMI_MONTHLY",
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
  const superAdmin = await db.user.upsert({
    where: { email: "superadmin@company.com" },
    update: {},
    create: { email: "superadmin@company.com", passwordHash: superHash, role: "SUPER_ADMIN" },
  });
  await db.user.upsert({
    where: { email: "hr@company.com" },
    update: {},
    create: { email: "hr@company.com", passwordHash: hrHash, role: "HR" },
  });
  await db.user.upsert({
    where: { email: "payroll@company.com" },
    update: {},
    create: { email: "payroll@company.com", passwordHash: payrollHash, role: "PAYROLL" },
  });

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
  const shifts = [
    { name: "Morning (8AM–5PM)", startTime: "08:00", endTime: "17:00", isNightShift: false, color: "#f59e0b" },
    { name: "Mid Shift (3PM–12MN)", startTime: "15:00", endTime: "00:00", isNightShift: true, color: "#8b5cf6" },
    { name: "Graveyard (10PM–7AM)", startTime: "22:00", endTime: "07:00", isNightShift: true, color: "#3b82f6" },
    { name: "Graveyard (11PM–8AM)", startTime: "23:00", endTime: "08:00", isNightShift: true, color: "#06b6d4" },
  ];
  for (const s of shifts) {
    await db.shiftTemplate.upsert({ where: { name: s.name }, update: {}, create: s });
  }

  // ---------- Government contribution tables ----------
  // NOTE: Verify amounts against the latest SSS/PhilHealth/BIR circulars before go-live.
  // The runtime engine computes from these parameters; updating the DB updates payroll.
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
  const site = await db.site.upsert({
    where: { name: "Tacloban Main Site" },
    update: {},
    create: { name: "Tacloban Main Site", address: "Tacloban City, Leyte" },
  });
  const ops = await db.department.upsert({ where: { name: "Operations" }, update: {}, create: { name: "Operations" } });
  await db.department.upsert({ where: { name: "Human Resources" }, update: {}, create: { name: "Human Resources" } });
  const fin = await db.department.upsert({ where: { name: "Finance" }, update: {}, create: { name: "Finance" } });
  const campaign = await db.campaign.upsert({
    where: { name: "Acme Voice Support" },
    update: {},
    create: { name: "Acme Voice Support", clientName: "Acme Corp." },
  });
  const csrPos = await db.position.upsert({ where: { title: "Customer Service Representative" }, update: {}, create: { title: "Customer Service Representative", level: 1 } });
  await db.position.upsert({ where: { title: "Senior Customer Service Representative" }, update: {}, create: { title: "Senior Customer Service Representative", level: 2 } });
  const leadPos = await db.position.upsert({ where: { title: "Team Lead" }, update: {}, create: { title: "Team Lead", level: 3 } });

  // ---------- Sample employees ----------
  async function seedEmployee(opts: {
    num: string;
    first: string;
    last: string;
    role: "EMPLOYEE" | "MANAGER";
    salary: number;
    deptId: string;
  }) {
    const email = `${opts.first.toLowerCase()}.${opts.last.toLowerCase()}@company.com`;
    const user = await db.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash: await bcrypt.hash("Employee@123", 12), role: opts.role },
    });
    const pin = `123${opts.num.slice(-2)}0`;
    return db.employee.upsert({
      where: { employeeNumber: opts.num },
      update: {},
      create: {
        employeeNumber: opts.num,
        userId: user.id,
        firstName: opts.first,
        lastName: opts.last,
        hireDate: new Date("2025-01-15"),
        employmentType: "REGULAR",
        basicSalary: opts.salary,
        dailyRate: Math.round(((opts.salary * 12) / 313) * 100) / 100,
        siteId: site.id,
        departmentId: opts.deptId,
        campaignId: campaign.id,
        positionId: csrPos.id,
        bundyPinHash: sha256(pin),
        bundyPinSetAt: new Date(),
        sssNumber: `34-${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}-0`,
        tinNumber: `123-456-${Math.floor(100 + Math.random() * 900)}-000`,
      },
    });
  }

  const emp1 = await seedEmployee({ num: "EMP0001", first: "Juan", last: "Dela Cruz", role: "MANAGER", salary: 32000, deptId: ops.id });
  const emp2 = await seedEmployee({ num: "EMP0002", first: "Maria", last: "Santos", role: "EMPLOYEE", salary: 21000, deptId: ops.id });
  await seedEmployee({ num: "EMP0003", first: "Pedro", last: "Ramos", role: "EMPLOYEE", salary: 21000, deptId: ops.id });

  // Link admin user to a real employee record so they can also punch
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
        reportsToId: null,
      },
    });
  }
  void emp1;
  void emp2;

  // ---------- Holidays (fixed-date Philippine holidays for current year) ----------
  const year = new Date().getFullYear();
  const fixedHolidays = [
    { date: `${year}-01-01`, name: "New Year's Day", type: "REGULAR" as const },
    { date: `${year}-04-09`, name: "Araw ng Kagitingan", type: "REGULAR" as const },
    { date: `${year}-05-01`, name: "Labor Day", type: "REGULAR" as const },
    { date: `${year}-06-12`, name: "Independence Day", type: "REGULAR" as const },
    { date: `${year}-08-30`, name: "National Heroes Day", type: "REGULAR" as const },
    { date: `${year}-11-30`, name: "Bonifacio Day", type: "REGULAR" as const },
    { date: `${year}-12-25`, name: "Christmas Day", type: "REGULAR" as const },
    { date: `${year}-12-30`, name: "Rizal Day", type: "REGULAR" as const },
    { date: `${year}-08-19`, name: "Quezon City Day (verify local)", type: "SPECIAL_NON_WORKING" as const },
  ];
  for (const h of fixedHolidays) {
    await db.holiday.upsert({
      where: { date: new Date(`${h.date}T00:00:00`) },
      update: {},
      create: { ...h, date: new Date(`${h.date}T00:00:00`) },
    });
  }

  console.log("\n✅ Seed complete!");
  console.log("─────────────────────────────────────────");
  console.log("Login accounts:");
  console.log("  Super:   superadmin@company.com / Super@12345  (system owner)");
  console.log("  Admin:   admin@company.com   / Admin@12345");
  console.log("  HR:      hr@company.com      / Hr@123456");
  console.log("  Payroll: payroll@company.com / Payroll@12345");
  console.log("  Manager: juan.delacruz@company.com / Employee@123");
  console.log("  Agent:   maria.santos@company.com / Employee@123");
  console.log("─────────────────────────────────────────");
  console.log("Bundy PINs (demo): EMP0001 → 123010, EMP0002 → 123020, EMP0003 → 123030");
  console.log("(Reset each employee's PIN from their record after go-live.)");
}

// ---------------------------------------------------------------------------
// Bracket data
// ---------------------------------------------------------------------------

const SSS_2025 = {
  note: "2025 schedule: 15% total on MSC ₱5,000–₱35,000. EE share computed by engine (5%).",
  minMsc: 5000,
  maxMsc: 35000,
  eeRate: 0.05,
  erRate: 0.095,
  ecRate: 0.005,
};

const PHILHEALTH_2025 = {
  note: "UHC Act premium schedule.",
  rate: 0.05,
  floor: 10000,
  ceiling: 100000,
};

const PAGIBIG_2025 = {
  note: "2% EE capped at ₱100/month.",
  rate: 0.02,
  cap: 100,
  threshold: 1500,
};

const BIR_TRAIN_MONTHLY = [
  { min: 0, max: 20833, base: 0, rate: 0 },
  { min: 20833, max: 33332, base: 0, rate: 0.15 },
  { min: 33333, max: 66666, base: 1875, rate: 0.2 },
  { min: 66667, max: 166666, base: 8541.8, rate: 0.25 },
  { min: 166667, max: 666666, base: 33541.8, rate: 0.3 },
  { min: 666667, base: 183541.8, rate: 0.35 },
];

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
