function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "object" ? Number(String(v)) : Number(v);
  return Number.isNaN(n) ? 0 : n;
}

export function formatCurrency(amount: unknown): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(num(amount));
}

export function formatNumber(n: unknown, digits = 2): string {
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(num(n));
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateOnly(d: Date | string | null | undefined): string {
  if (!d) return "—";
  // Normalize to local date to avoid TZ shifting when stored as UTC midnight
  const date = new Date(d);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function formatTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return `${formatDate(d)} ${formatTime(d)}`;
}

export function minutesToHoursMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return "0h 00m";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function initials(first?: string | null, last?: string | null): string {
  return `${(first ?? "?")[0] ?? ""}${(last ?? "")[0] ?? ""}`.toUpperCase();
}

export function fullName(e: { firstName: string; lastName: string; middleName?: string | null; suffix?: string | null }): string {
  return [e.firstName, e.middleName ? `${e.middleName[0]}.` : null, e.lastName, e.suffix]
    .filter(Boolean)
    .join(" ");
}
