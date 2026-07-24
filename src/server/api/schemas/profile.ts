import type { AgeBand, Sex } from "../../../domain/reference/types";
import type { StoredProfile } from "../../store/profileStore";

/**
 * GET/PUT /api/profile — local reference-demographic setting (birth date
 * × sex). MVP has no auth: this only selects which DRI 2025 rows the
 * daily summary compares against
 * (decision-20260715-mvp-data-api-simplification). The age band is
 * derived from the birth date per evaluated date, never stored
 * (decision-20260724-birthdate-profile).
 */

export const AGE_BANDS: readonly AgeBand[] = [
  "adult_18_29",
  "adult_30_49",
  "adult_50_64",
  "adult_65_74",
  "adult_75_plus",
];

export const SEXES: readonly Sex[] = ["male", "female"];

/** DRI 2025 has no adult rows below 18 — the seed cannot be compared. */
export const MIN_SUPPORTED_AGE = 18;
/** Guards typos like 1090-01-01 while staying well beyond any real age. */
export const MAX_SUPPORTED_AGE = 120;

export type ProfileResponse = {
  /** ageBand is the band derived for today, for display only. */
  profile: (StoredProfile & { ageBand?: AgeBand }) | null;
};

export type { AgeBand, Sex };
