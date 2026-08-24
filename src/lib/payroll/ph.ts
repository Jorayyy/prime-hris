/**
 * Philippine payroll computation engine.
 *
 * Rates follow DOLE Handbook on Workers' Statutory Monetary Benefits,
 * the 2019 SSS Contribution Schedule (RA 11199, stepped up through 2025),
 * PhilHealth UHC Act premium schedule, Pag-IBIG Fund rules, and the
 * TRAIN Law withholding tax tables (revised 2023, still current).
 *
 * All bracket tables are parameterized so they can be loaded from the
 * GovContributionTable database records — update rates without redeploying.
 */

export type TaxBracket = {
  min: number;
  max?: number; // undefined = open-ended top bracket
  base: number; // base tax amount
  rate: number; // marginal rate over the excess
};

export type SssResult = { ee: number; er: number; ec: number; msc: number };
export type SimpleContribution = number;

// ---------------------------------------------------------------------------
// Monthly Salary Credit (MSC) helpers
// ---------------------------------------------------------------------------

/** Floor a salary to its SSS MSC bracket lower bound (2025 schedule). */
const SSS_BRACKET_STEPS: Array<[min: number, nextMin: number]> = (() => {
  const steps: Array<[number, number]> = [];
  let cur = 5000;
  while (cur < 35000) {
    const width = cur < 5250 ? 250 : 500;
    const next = cur + width;
    steps.push([cur, next]);
    cur = next;
  }
  return steps;
})();

export function sssMsc(monthlySalary: number): number {
  if (monthlySalary <= 5000) return 5000;
  if (monthlySalary >= 35000) return 35000;
  for (const [min, next] of SSS_BRACKET_STEPS) {
    if (monthlySalary < next) return min;
  }
  return 35000;
}

/**
 * SSS contribution (2025: 15% of MSC — EE 4.5% + ER 9.5% + EC 0.75%
 * for employers with ≥10 employees; EE share is 5% under RA 11199 final
 * schedule. We model EE 5% / ER 9.5% / EC 0.5% ≈ published table.)
 * Pass custom rates if a new circular changes them.
 */
export function computeSss(
  monthlySalary: number,
  opts?: { eeRate?: number; erRate?: number; ecRate?: number },
): SssResult {
  const msc = sssMsc(monthlySalary);
  const eeRate = opts?.eeRate ?? 0.05;
  const erRate = opts?.erRate ?? 0.095;
  const ecRate = opts?.ecRate ?? 0.005;
  return {
    msc,
    ee: round2(msc * eeRate),
    er: round2(msc * erRate),
    ec: round2(msc * ecRate),
  };
}

// ---------------------------------------------------------------------------
// PhilHealth (UHC Act: 5% of basic monthly salary, floor ₱10k, cap ₱100k)
// ---------------------------------------------------------------------------

export function computePhilHealth(
  monthlySalary: number,
  opts?: { rate?: number; floor?: number; ceiling?: number },
): number {
  const rate = opts?.rate ?? 0.05;
  const floor = opts?.floor ?? 10000;
  const ceiling = opts?.ceiling ?? 100000;
  const base = Math.min(Math.max(monthlySalary, floor), ceiling);
  return round2((base * rate) / 2); // EE share = half of total premium
}

// ---------------------------------------------------------------------------
// Pag-IBIG (2% of monthly compensation, EE share capped at ₱100)
// ---------------------------------------------------------------------------

export function computePagIbig(
  monthlyCompensation: number,
  opts?: { rate?: number; cap?: number; threshold?: number },
): number {
  const rate = opts?.rate ?? 0.02;
  const cap = opts?.cap ?? 100;
  const threshold = opts?.threshold ?? 1500;
  if (monthlyCompensation < threshold) return round2(monthlyCompensation * 0.01);
  return Math.min(round2(monthlyCompensation * rate), cap);
}

// ---------------------------------------------------------------------------
// BIR Withholding tax — TRAIN tables (RMC No. 40-2023, eff. Jan 1 2023)
// ---------------------------------------------------------------------------

export const TAX_TABLES_MONTHLY: TaxBracket[] = [
  { min: 0, max: 20833, base: 0, rate: 0 },
  { min: 20833, max: 33332, base: 0, rate: 0.15 },
  { min: 33333, max: 66666, base: 1875, rate: 0.2 },
  { min: 66667, max: 166666, base: 8541.8, rate: 0.25 },
  { min: 166667, max: 666666, base: 33541.8, rate: 0.3 },
  { min: 666667, base: 183541.8, rate: 0.35 },
];

export const TAX_TABLES_SEMI_MONTHLY: TaxBracket[] = [
  { min: 0, max: 10417, base: 0, rate: 0 },
  { min: 10417, max: 16666, base: 0, rate: 0.15 },
  { min: 16667, max: 33333, base: 937.5, rate: 0.2 },
  { min: 33334, max: 83333, base: 4270.9, rate: 0.25 },
  { min: 83334, max: 333333, base: 16770.9, rate: 0.3 },
  { min: 333334, base: 91770.9, rate: 0.35 },
];

export type PayFrequencyCode = "MONTHLY" | "SEMI_MONTHLY" | "BIWEEKLY" | "WEEKLY";

export function computeWithholdingTax(
  taxableIncome: number,
  frequency: PayFrequencyCode,
  tableOverride?: TaxBracket[],
): number {
  let table = tableOverride;
  if (!table) {
    switch (frequency) {
      case "SEMI_MONTHLY":
        table = TAX_TABLES_SEMI_MONTHLY;
        break;
      case "BIWEEKLY":
      case "WEEKLY":
        // Approximate weekly/biweekly by scaling monthly table proportionally
        table = TAX_TABLES_MONTHLY.map((b) => ({
          ...b,
          min: round2(b.min * (frequency === "WEEKLY" ? 12 / 52 : 12 / 26)),
          max: b.max !== undefined ? round2(b.max * (frequency === "WEEKLY" ? 12 / 52 : 12 / 26)) : undefined,
          base: round2(b.base * (frequency === "WEEKLY" ? 12 / 52 : 12 / 26)),
        }));
        break;
      default:
        table = TAX_TABLES_MONTHLY;
    }
  }

  for (const b of table) {
    if (taxableIncome >= b.min && (b.max === undefined || taxableIncome <= b.max)) {
      return round2(b.base + Math.max(0, taxableIncome - b.min) * b.rate);
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Rate factors (DOLE standards)
// ---------------------------------------------------------------------------

/** Days-per-year factor for converting monthly salary to daily rate (monthly-paid). */
export const MONTHLY_PAID_FACTOR = 313;

export function dailyRateFromMonthly(monthly: number): number {
  return round2((monthly * 12) / MONTHLY_PAID_FACTOR);
}

export function hourlyRateFromDaily(daily: number): number {
  return round2(daily / 8);
}

export const RATES = {
  NIGHT_DIFF: 0.1, // +10% of hourly rate for 10PM–6AM hours
  OT_ORDINARY: 1.25, // +25% hourly
  OT_REST_DAY: 1.69,
  HOLIDAY_REGULAR_WORKED: 2.0, // double pay
  HOLIDAY_REGULAR_REST_DAY: 2.6,
  HOLIDAY_SPECIAL_WORKED: 1.3,
  HOLIDAY_SPECIAL_REST_DAY: 1.5,
  REGULAR_HOLIDAY_UNWORKED: 1.0, // paid even if not worked (regular employees)
} as const;

/** Night-differential pay given ND minutes worked inside 10PM–6AM window. */
export function computeNightDiffPay(hourlyRate: number, nightDiffMinutes: number, ndRate = RATES.NIGHT_DIFF): number {
  return round2(hourlyRate * ndRate * (nightDiffMinutes / 60));
}

export function computeOvertimePay(hourlyRate: number, otHours: number, multiplier = RATES.OT_ORDINARY): number {
  return round2(hourlyRate * multiplier * otHours);
}

/** 13th month pay = total basic salary earned during the year ÷ 12 */
export function compute13thMonth(totalBasicForYear: number): number {
  return round2(totalBasicForYear / 12);
}

// ---------------------------------------------------------------------------
// Full payslip calculation
// ---------------------------------------------------------------------------

export type PayslipInput = {
  monthlyRate: number;
  payFrequency: PayFrequencyCode;
  /** Number of days in the period that were worked (present/late). */
  daysWorked: number;
  /** Paid leave days counted as work. */
  paidLeaveDays: number;
  lateMinutes: number;
  undertimeMinutes: number;
  nightDiffMinutes: number;
  approvedOvertimeHours: number;
  /** Regular-holiday days that fell in the period and were not worked but are payable. */
  unworkedRegularHolidayDays: number;
  /** Regular holidays actually worked (earns the 200% premium on top of basic). */
  workedRegularHolidayDays: number;
  specialHolidaysWorkedDays: number;
  taxableEarnings: Array<{ label: string; amount: number }>;
  nonTaxableEarnings: Array<{ label: string; amount: number }>;
  deductions: Array<{ label: string; amount: number }>;
  thirteenthMonthYtd: number;
  graceMinutes?: number;
};

export type PayslipOutput = {
  dailyRate: number;
  hourlyRate: number;
  basicPay: number;
  nightDiffPay: number;
  overtimePay: number;
  holidayPay: number;
  lateAbsenceDeduction: number;
  taxableGross: number;
  nonTaxableGross: number;
  grossPay: number;
  sss: number;
  philhealth: number;
  pagibig: number;
  withholdingTax: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
};

export function computePayslip(input: PayslipInput): PayslipOutput {
  const dailyRate = dailyRateFromMonthly(input.monthlyRate);
  const hourlyRate = hourlyRateFromDaily(dailyRate);

  const payableDays = input.daysWorked + input.paidLeaveDays;
  const basicPay = round2(dailyRate * payableDays);

  // Unworked regular holidays are payable for regular employees
  const holidayPay = round2(
    dailyRate *
      (input.unworkedRegularHolidayDays * RATES.REGULAR_HOLIDAY_UNWORKED +
        input.workedRegularHolidayDays * (RATES.HOLIDAY_REGULAR_WORKED - 1) +
        input.specialHolidaysWorkedDays * (RATES.HOLIDAY_SPECIAL_WORKED - 1)),
  );

  const nightDiffPay = computeNightDiffPay(hourlyRate, input.nightDiffMinutes);
  const overtimePay = computeOvertimePay(hourlyRate, input.approvedOvertimeHours);

  const grace = input.graceMinutes ?? 0;
  const billableLate = Math.max(0, input.lateMinutes - grace);
  const lateAbsenceDeduction = round2(
    (hourlyRate / 60) * billableLate + (hourlyRate / 60) * input.undertimeMinutes,
  );

  const taxableAdditions = input.taxableEarnings.reduce((s, a) => s + a.amount, 0);
  const nonTaxableAdditions = input.nonTaxableEarnings.reduce((s, a) => s + a.amount, 0);

  const taxableGross = round2(
    Math.max(0, basicPay + holidayPay + nightDiffPay + overtimePay + taxableAdditions - lateAbsenceDeduction),
  );
  const grossPay = round2(taxableGross + nonTaxableAdditions);

  const sss = computeSss(input.monthlyRate).ee;
  const philhealth = computePhilHealth(input.monthlyRate);
  const pagibig = computePagIbig(input.monthlyRate);

  const statutoryDeductions = round2(sss + philhealth + pagibig);
  const taxableIncome = round2(Math.max(0, taxableGross - statutoryDeductions));
  const withholdingTax = computeWithholdingTax(taxableIncome, input.payFrequency);

  const otherDeductions = round2(input.deductions.reduce((s, d) => s + d.amount, 0));
  const totalDeductions = round2(statutoryDeductions + withholdingTax + otherDeductions);
  const netPay = round2(grossPay - totalDeductions);

  return {
    dailyRate,
    hourlyRate,
    basicPay,
    nightDiffPay,
    overtimePay,
    holidayPay,
    lateAbsenceDeduction,
    taxableGross,
    nonTaxableGross: round2(nonTaxableAdditions),
    grossPay,
    sss,
    philhealth,
    pagibig,
    withholdingTax,
    otherDeductions,
    totalDeductions,
    netPay,
  };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
