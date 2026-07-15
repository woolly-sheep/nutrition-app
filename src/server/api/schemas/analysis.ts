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
  } | null;
  /** Calculation warning codes only — never meal contents. */
  warning_codes: readonly string[];
  disclaimer: string;
  sources: readonly string[];
};

export const DATA_SOURCES = [
  "日本食品標準成分表(八訂)増補2023年",
  "日本人の食事摂取基準(2025年版)",
] as const;
