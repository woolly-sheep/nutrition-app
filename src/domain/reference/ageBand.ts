import type { AgeBand } from "./types";

/**
 * Birth date → DRI 2025 age band. The frozen seed only carries adult
 * bands (18+), so younger ages resolve to "under_18" and the caller must
 * present that as "no comparable reference" — never fall back to the
 * nearest band, which would compare against values that are not the
 * user's (decision-20260724-birthdate-profile).
 */

export type AgeBandResolution =
  | { ok: true; ageBand: AgeBand; age: number }
  | { ok: false; reason: "under_18"; age: number };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar-correct completed years between two ISO dates. */
export function ageOn(birthDate: string, onDate: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [oy, om, od] = onDate.split("-").map(Number);
  let age = oy - by;
  if (om < bm || (om === bm && od < bd)) {
    age -= 1;
  }
  return age;
}

export function isValidBirthDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) {
    return false;
  }
  const [y, m, d] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return (
    parsed.getUTCFullYear() === y &&
    parsed.getUTCMonth() === m - 1 &&
    parsed.getUTCDate() === d
  );
}

/**
 * Resolved against the date being evaluated, not against today, so a
 * past day keeps the band the user was actually in on that day.
 */
export function resolveAgeBand(
  birthDate: string,
  onDate: string,
): AgeBandResolution {
  const age = ageOn(birthDate, onDate);
  if (age < 18) {
    return { ok: false, reason: "under_18", age };
  }
  if (age <= 29) {
    return { ok: true, ageBand: "adult_18_29", age };
  }
  if (age <= 49) {
    return { ok: true, ageBand: "adult_30_49", age };
  }
  if (age <= 64) {
    return { ok: true, ageBand: "adult_50_64", age };
  }
  if (age <= 74) {
    return { ok: true, ageBand: "adult_65_74", age };
  }
  return { ok: true, ageBand: "adult_75_plus", age };
}
