/**
 * Work-date resolution for a BPO with shifts that cross midnight.
 *
 * A punch at 2026-08-25 01:30 AM belongs to the shift that started
 * 2026-08-24 22:00 → its workDate is 2026-08-24.
 *
 * Rule: if local time is before `dayBoundaryHour` (default 4 AM —
 * configurable grace window after midnight), the workDate is the previous day.
 */

export const DEFAULT_DAY_BOUNDARY_HOUR = 4;

export function resolveWorkDate(timestamp: Date, timezone = "Asia/Manila", dayBoundaryHour = DEFAULT_DAY_BOUNDARY_HOUR): Date {
  const local = new Date(
    timestamp.toLocaleString("en-US", { timeZone: timezone }),
  );
  const hour = local.getHours();
  if (hour < dayBoundaryHour) {
    local.setDate(local.getDate() - 1);
  }
  local.setHours(0, 0, 0, 0);
  return local;
}

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parse "HH:MM" on top of a date into a Date in server-local time. */
export function atTime(dateStr: string, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(`${dateStr}T00:00:00`);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

/**
 * Minutes between two times handling overnight end times
 * (e.g., 22:00 → 07:00 = 540 minutes).
 */
export function shiftDurationMinutes(startHhmm: string, endHhmm: string): number {
  const [sh, sm] = startHhmm.split(":").map(Number);
  const [eh, em] = endHhmm.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) mins += 24 * 60;
  return mins;
}

/** Minutes of a shift window [start, end] falling inside night-diff window. */
export function nightDiffMinutesForShift(startHhmm: string, endHhmm: string, ndStart = 22, ndEnd = 6): number {
  let total = 0;
  const duration = shiftDurationMinutes(startHhmm, endHhmm);
  const [sh, sm] = startHhmm.split(":").map(Number);
  for (let i = 0; i < duration; i++) {
    const hour = ((sh + Math.floor((sm + i) / 60)) % 24 + 24) % 24;
    if (hour >= ndStart || hour < ndEnd) total++;
  }
  return total;
}
