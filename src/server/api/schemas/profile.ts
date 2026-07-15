import type { AgeBand, Sex } from "../../../domain/reference/types";

/**
 * GET/PUT /api/profile — local reference-demographic setting (age band ×
 * sex). MVP has no auth: this only selects which DRI 2025 rows the daily
 * summary compares against (decision-20260715-mvp-data-api-simplification).
 */

export const AGE_BANDS: readonly AgeBand[] = [
  "adult_18_29",
  "adult_30_49",
  "adult_50_64",
  "adult_65_74",
  "adult_75_plus",
];

export const SEXES: readonly Sex[] = ["male", "female"];

export type ProfileResponse = {
  profile: { sex: Sex; ageBand: AgeBand } | null;
};
