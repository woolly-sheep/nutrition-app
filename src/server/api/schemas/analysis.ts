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
  /** Combined food + supplement intake (what the judgment is based on). */
  intake_amount: number;
  /** Food-derived share of intake_amount (official composition). */
  food_amount: number;
  /** Supplement-derived share of intake_amount (self-reported); 0 when none. */
  supplement_amount: number;
  /** Official value exactly as stored in the frozen seed. */
  reference_value: number | string | null;
  /** Combined intake ÷ reference × 100. */
  percent_of_reference?: number;
  /** Food-only intake ÷ reference × 100 — the solid part of a split bar. */
  percent_of_reference_food?: number;
  remaining_amount?: number;
};

/**
 * Supplement-only intake compared against a non-food tolerable upper limit
 * (magnesium etc.). Separate from ul_reached: the limit applies to the
 * supplement share alone, not the combined intake
 * (decision-20260724-supplement-intake).
 */
export type NonFoodLimitItem = {
  nutrient_code: string;
  nutrient_name: string;
  unit: string;
  supplement_amount: number;
  limit_value: number;
  percent_of_limit: number;
  exceeded: boolean;
  /** SafeWordingService label. */
  label: string;
  note: string;
};

/**
 * A food-untracked supplement nutrient (n-3 系脂肪酸 等) compared against its
 * AI. Only the supplement share is known — food intake is out of scope — so
 * this is presented as "supplement vs reference", never as a fulfilment
 * figure (decision-20260724-supplement-products).
 */
export type FoodUntrackedItem = {
  nutrient_code: string;
  nutrient_name: string;
  unit: string;
  supplement_amount: number;
  /** Adequate intake, or null when the profile band is unavailable. */
  ai: number | null;
  /** supplement ÷ AI × 100, or null when AI is unavailable. */
  percent_of_ai: number | null;
  label: string;
  note: string;
};

/**
 * A 重点栄養素 (focus nutrient) row for the home board — one 目標量(DG)
 * nutrient shown individually (issue #34). `direction` picks the display:
 * gain fills toward the minimum, balance marks a %E share on its range,
 * limit fills toward the maximum. Facts only; label via SafeWordingService.
 */
export type FocusNutrientItem = {
  nutrient_code: string;
  nutrient_name: string;
  unit: string;
  direction: "gain" | "balance" | "limit";
  status: JudgmentStatus;
  label: string;
  /** Intake (gain·limit) or %E share (balance); null when unknown. */
  value: number | null;
  /** DG minimum (gain) or maximum (limit); null for balance. */
  goal_value: number | null;
  range_min?: number;
  range_max?: number;
  /** 0..1+ progress toward the bound; null for balance / unknown. */
  fill_ratio: number | null;
  reached: boolean;
  /** To the goal (gain) or headroom under the limit (limit); null otherwise. */
  remaining: number | null;
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
    /** 重点栄養素 board — the 目標量(DG) nutrients, individually (#34). */
    focus_nutrients: readonly FocusNutrientItem[];
    /** Supplement-only non-food UL checks — empty unless a supplement hits one. */
    non_food_limits: readonly NonFoodLimitItem[];
    /** Food-untracked supplement nutrients (n-3 等) vs their AI — empty unless recorded. */
    food_untracked: readonly FoodUntrackedItem[];
  } | null;
  /** True when any nutrient this day has a supplement-derived share. */
  has_supplements: boolean;
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

/**
 * GET /api/analysis/contribution?date&nutrient — for one nutrient, which
 * recorded foods contributed it today (dashboard insight ②). Food-derived
 * share only; a factual breakdown of the user's own records, never advice.
 */
export type ContributionFoodItem = {
  food_id: string;
  display_name: string;
  /** Nutrient amount this food contributed. */
  amount: number;
  /** amount ÷ total × 100. */
  percent: number;
};

export type NutrientContributionResponse = {
  date: string;
  nutrient_code: string;
  nutrient_name: string;
  unit: string;
  /** false when there are no records for this day. */
  has_records: boolean;
  /** Total food-derived amount of this nutrient today. */
  total_amount: number;
  /** Top contributors, largest first. */
  foods: readonly ContributionFoodItem[];
  /** Combined amount beyond the listed foods. */
  other_amount: number;
  other_percent: number;
  /** Mandatory source/estimate notice. */
  notice: string;
  sources: readonly string[];
};

/**
 * GET /api/analysis/trend?date&nutrient&days — one nutrient's fulfilment
 * over the trailing window ending at `date` (dashboard insight ③).
 * Percent is intake ÷ that day's reference × 100, so the 100 line stays a
 * fixed goal even when the age band shifts. Missing days are null, never
 * zero-filled (same rule as the weekly report).
 */
export type NutrientTrendPoint = {
  date: string;
  /** intake ÷ reference × 100 on a recorded day, else null. */
  percent: number | null;
  has_record: boolean;
};

export type NutrientTrendResponse = {
  date: string;
  nutrient_code: string;
  nutrient_name: string;
  unit: string;
  window_days: number;
  /** true when no profile is set — series is empty. */
  profile_required: boolean;
  /** Oldest → newest. */
  points: readonly NutrientTrendPoint[];
  recorded_days: number;
  /** Recorded days whose percent fell below the reference (100%). */
  days_below_reference: number;
  notice: string;
  sources: readonly string[];
};

export const DATA_SOURCES = [
  "日本食品標準成分表(八訂)増補2023年",
  "日本人の食事摂取基準(2025年版)",
] as const;
