import type { JudgmentStatus } from "../../../domain/reference/types";
import type { StoredProfile } from "../../store/profileStore";

/**
 * GET /api/analysis?date=YYYY-MM-DD — daily summary for the home screen.
 * Estimates only; every label passes through SafeWordingService.
 */

export type AnalysisNutrientItem = {
  nutrient_code: string;
  nutrient_name: string;
  unit: string;
  reference_type: string;
  status: JudgmentStatus;
  /** SafeWordingService label (tendency/estimate wording, never 断定). */
  label: string;
  /** Required accompanying note when the wording policy demands one. */
  note?: string;
  intake_amount: number;
  /** Official value exactly as stored in the frozen seed. */
  reference_value: number | string | null;
  percent_of_reference?: number;
  remaining_amount?: number;
};

/** UL/DG threshold exceedance (UI design v0.2 addendum §1/§3). */
export type AnalysisExceedanceItem = AnalysisNutrientItem & {
  threshold_value: number;
  over_amount: number;
  percent_of_threshold: number;
  /** Per-meal contribution (参考情報), largest first. Codes+amounts only. */
  meal_breakdown: readonly { meal_type: string; amount: number }[];
  /**
   * %E-range DGs only (unit === "%E"): the goal range lower bound.
   * threshold_value is the upper bound; intake_amount is the %E share.
   */
  range_min?: number;
};

export type DailyAnalysisResponse = {
  date: string;
  profile: StoredProfile | null;
  /** false when the profile is not set yet — summary is omitted. */
  profile_required: boolean;
  has_records: boolean;
  summary: {
    achieved: readonly AnalysisNutrientItem[];
    insufficient: readonly AnalysisNutrientItem[];
    comparable_count: number;
    at_least_80_count: number;
    within_goal_count: number;
    /** 7a section — empty on days with no UL exceedance. */
    ul_reached: readonly AnalysisExceedanceItem[];
    /** 6b section — empty on days with no DG overage. */
    dg_over: readonly AnalysisExceedanceItem[];
  } | null;
  /** Calculation warning codes only — never meal contents. */
  warning_codes: readonly string[];
  disclaimer: string;
  sources: readonly string[];
};

/** GET /api/analysis?period=weekly — weekly fulfillment report (5c/6c). */
export type WeeklyNutrientItem = {
  nutrient_code: string;
  nutrient_name: string;
  unit: string;
  /** Mean over recorded days only — missing days are never zero-filled. */
  average_percent: number;
  days_below_50: number;
  days_achieved: number;
  recorded_days: number;
  daily: readonly { date: string; percent: number | null }[];
};

export type WeeklyPatternItem = {
  nutrient_code: string;
  nutrient_name: string;
  days_below_50: number;
  recorded_days: number;
};

export type WeeklyAnalysisResponse = {
  date: string;
  week_start: string;
  week_end: string;
  profile: StoredProfile | null;
  profile_required: boolean;
  recorded_dates: readonly string[];
  /** Evaluated days with no records — excluded from averages (6c). */
  missing_dates: readonly string[];
  nutrients: readonly WeeklyNutrientItem[];
  patterns: readonly WeeklyPatternItem[];
  disclaimer: string;
  sources: readonly string[];
};

export const DATA_SOURCES = [
  "日本食品標準成分表(八訂)増補2023年",
  "日本人の食事摂取基準(2025年版)",
] as const;
