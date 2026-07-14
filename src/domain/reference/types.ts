import type { OfficialValue } from "../../seed/types";

export type Sex = "male" | "female";

export type AgeBand =
  | "adult_18_29"
  | "adult_30_49"
  | "adult_50_64"
  | "adult_65_74"
  | "adult_75_plus";

export type UserProfile = {
  sex: Sex;
  ageBand: AgeBand;
  /** EER rows are split by activity level; other rows are not_applicable. */
  activityLevel?: "low";
};

/**
 * Factual comparison outcomes. Statuses are deliberately per
 * reference_type so RDA/AI, UL, and DG semantics are never mixed
 * (e.g. exceeding a DG is not presented as exceeding a UL).
 * Wording for display is SafeWordingService's job, not this layer's.
 */
export type JudgmentStatus =
  | "below_reference" // RDA/AI: intake below the reference value
  | "meets_reference" // RDA/AI: intake at or above the reference value
  | "above_upper_limit" // UL: intake above the tolerable upper intake level
  | "below_upper_limit" // UL: intake at or below the level
  | "within_goal" // DG: intake satisfies the tentative dietary goal
  | "above_goal" // DG: intake above the goal range / less-than bound
  | "below_goal" // DG: intake below the goal range / at-least bound
  | "reference_only" // EAR/EER: shown as reference, never judged
  | "not_applicable" // official value is not_established
  | "unknown"; // value exists but cannot be compared safely

export type JudgmentUnknownReason =
  | "conditional_value"
  | "energy_ratio_range"
  | "unparsable_value";

export type NutrientJudgment = {
  nutrientCode: string;
  nutrientName: string;
  referenceType: string;
  judgmentPolicy: string;
  status: JudgmentStatus;
  unknownReason?: JudgmentUnknownReason;
  /** Official value exactly as stored in the frozen seed. */
  referenceValue: OfficialValue;
  unit: string;
  intakeAmount: number;
};
