import type { TimeLogType } from "@prisma/client";

/**
 * Punch state machine for the bundy clock.
 *
 * Sequence: In → 1st Break Out/In → Lunch Out/In → 2nd Break Out/In → Out.
 * Breaks are optional (an employee may skip straight from In to Lunch or Out),
 * but each punch may only be used once per work date, must follow a valid
 * predecessor, and an "out"-type punch requires being on the floor.
 */

export const PUNCH_TYPES: TimeLogType[] = [
  "IN",
  "FIRST_BREAK_OUT",
  "FIRST_BREAK_IN",
  "LUNCH_OUT",
  "LUNCH_IN",
  "SECOND_BREAK_OUT",
  "SECOND_BREAK_IN",
  "OUT",
];

export const PUNCH_LABELS: Record<TimeLogType, string> = {
  IN: "In",
  FIRST_BREAK_OUT: "1st Break Out",
  FIRST_BREAK_IN: "1st Break In",
  LUNCH_OUT: "Lunch Out",
  LUNCH_IN: "Lunch In",
  SECOND_BREAK_OUT: "2nd Break Out",
  SECOND_BREAK_IN: "2nd Break In",
  OUT: "Out",
};

/** Which punch types are valid immediately after the given one was logged. */
const TRANSITIONS: Record<TimeLogType | "START", TimeLogType[]> = {
  START: ["IN"],
  IN: ["FIRST_BREAK_OUT", "LUNCH_OUT", "SECOND_BREAK_OUT", "OUT"],
  FIRST_BREAK_OUT: ["FIRST_BREAK_IN"],
  FIRST_BREAK_IN: ["LUNCH_OUT", "SECOND_BREAK_OUT", "OUT"],
  LUNCH_OUT: ["LUNCH_IN"],
  LUNCH_IN: ["SECOND_BREAK_OUT", "OUT"],
  SECOND_BREAK_OUT: ["SECOND_BREAK_IN"],
  SECOND_BREAK_IN: ["OUT"],
  OUT: [],
};

export function allowedNextPunches(lastType: TimeLogType | null): TimeLogType[] {
  return TRANSITIONS[lastType ?? "START"];
}

export type PunchLog = { type: TimeLogType; timestamp: Date };

/** Last punch in chronological order. */
export function lastPunch(logs: PunchLog[]): TimeLogType | null {
  return logs.length ? logs[logs.length - 1].type : null;
}

/**
 * The system's best guess for what the employee is about to punch,
 * used to preselect the kiosk dropdown.
 */
export function expectedNextPunch(logs: PunchLog[]): TimeLogType {
  const next = allowedNextPunches(lastPunch(logs));
  return next[0] ?? "IN";
}

export function validatePunch(type: TimeLogType, logs: PunchLog[]): { ok: true } | { ok: false; error: string } {
  if (logs.some((l) => l.type === type)) {
    return { ok: false, error: `${PUNCH_LABELS[type]} was already recorded for this shift.` };
  }
  const allowed = allowedNextPunches(lastPunch(logs));
  if (!allowed.includes(type)) {
    return {
      ok: false,
      error:
        lastPunch(logs) === null
          ? "Clock IN first before recording breaks or clock-out."
          : `Invalid punch. Expected one of: ${allowed.map((t) => PUNCH_LABELS[t]).join(", ")}.`,
    };
  }
  return { ok: true };
}

/** Total paid-break minutes from completed out/in pairs. */
export function computeBreakMinutes(logs: PunchLog[]): number {
  const pairs: Array<[TimeLogType, TimeLogType]> = [
    ["FIRST_BREAK_OUT", "FIRST_BREAK_IN"],
    ["LUNCH_OUT", "LUNCH_IN"],
    ["SECOND_BREAK_OUT", "SECOND_BREAK_IN"],
  ];
  let minutes = 0;
  for (const [outT, inT] of pairs) {
    const out = logs.find((l) => l.type === outT);
    const inn = logs.find((l) => l.type === inT);
    if (out && inn && inn.timestamp > out.timestamp) {
      minutes += Math.round((inn.timestamp.getTime() - out.timestamp.getTime()) / 60000);
    }
  }
  return minutes;
}
