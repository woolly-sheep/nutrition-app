import type { NutrientReferenceRecord } from "../../seed/types";
import { parseOfficialValue, type ParsedOfficialValue } from "./officialValue";
import type {
  JudgmentStatus,
  JudgmentUnknownReason,
  NutrientJudgment,
  UserProfile,
} from "./types";

/**
 * DG values for these nutrients are energy-ratio ranges (%E) in the DRI
 * 2025 report, even though the frozen seed stores them with unit "g"
 * (preserved as-is on purpose). Comparing gram intake against them would
 * state a false fact, so MVP returns unknown instead of judging.
 */
const ENERGY_RATIO_DG_NUTRIENTS: ReadonlySet<string> = new Set([
  "protein_g",
  "fat_g",
  "carbohydrate_g",
]);

/**
 * Compares nutrient intake against the frozen dietary reference records
 * for one user profile, keeping each reference_type's semantics separate.
 * Anything that cannot be compared safely comes back as
 * unknown / not_applicable — never as a guessed judgment.
 */
export function judgeAgainstReference(
  intakeByNutrientCode: ReadonlyMap<string, number>,
  profile: UserProfile,
  references: readonly NutrientReferenceRecord[],
): readonly NutrientJudgment[] {
  return references
    .filter((record) => matchesProfile(record, profile))
    .map((record) => judgeRecord(record, intakeByNutrientCode));
}

function matchesProfile(
  record: NutrientReferenceRecord,
  profile: UserProfile,
): boolean {
  if (record.sex !== profile.sex) return false;
  if (record.age_band !== profile.ageBand) return false;
  if (record.activity_level === "not_applicable") return true;
  return record.activity_level === profile.activityLevel;
}

function judgeRecord(
  record: NutrientReferenceRecord,
  intakeByNutrientCode: ReadonlyMap<string, number>,
): NutrientJudgment {
  const intakeAmount = intakeByNutrientCode.get(record.nutrient_code) ?? 0;
  const { status, unknownReason } = judgeStatus(record, intakeAmount);
  return {
    nutrientCode: record.nutrient_code,
    nutrientName: record.nutrient_name,
    referenceType: record.reference_type,
    judgmentPolicy: record.judgment_policy,
    status,
    ...(unknownReason ? { unknownReason } : {}),
    referenceValue: record.value,
    unit: record.unit,
    intakeAmount,
  };
}

type StatusResult = {
  status: JudgmentStatus;
  unknownReason?: JudgmentUnknownReason;
};

function judgeStatus(
  record: NutrientReferenceRecord,
  intakeAmount: number,
): StatusResult {
  switch (record.reference_type) {
    case "recommended_dietary_allowance":
    case "adequate_intake":
      return judgeIntakeReference(record, intakeAmount);
    case "tolerable_upper_intake_level":
      return judgeUpperLimit(record, intakeAmount);
    case "tentative_dietary_goal":
      return judgeDietaryGoal(record, intakeAmount);
    case "estimated_average_requirement":
    case "estimated_energy_requirement":
      return { status: "reference_only" };
    default:
      return { status: "unknown", unknownReason: "unparsable_value" };
  }
}

function judgeIntakeReference(
  record: NutrientReferenceRecord,
  intakeAmount: number,
): StatusResult {
  const parsed = parseOfficialValue(record.value);
  if (parsed.kind === "exact") {
    return {
      status:
        intakeAmount < parsed.value ? "below_reference" : "meets_reference",
    };
  }
  return nonComparable(parsed);
}

function judgeUpperLimit(
  record: NutrientReferenceRecord,
  intakeAmount: number,
): StatusResult {
  const parsed = parseOfficialValue(record.value);
  if (parsed.kind === "exact") {
    return {
      status:
        intakeAmount > parsed.value ? "above_upper_limit" : "below_upper_limit",
    };
  }
  return nonComparable(parsed);
}

function judgeDietaryGoal(
  record: NutrientReferenceRecord,
  intakeAmount: number,
): StatusResult {
  if (ENERGY_RATIO_DG_NUTRIENTS.has(record.nutrient_code)) {
    return { status: "unknown", unknownReason: "energy_ratio_range" };
  }

  const parsed = parseOfficialValue(record.value);
  if (parsed.kind === "range") {
    if (intakeAmount < parsed.min) return { status: "below_goal" };
    if (intakeAmount > parsed.max) return { status: "above_goal" };
    return { status: "within_goal" };
  }
  if (parsed.kind === "at_least") {
    return {
      status: intakeAmount >= parsed.min ? "within_goal" : "below_goal",
    };
  }
  if (parsed.kind === "less_than") {
    return { status: intakeAmount < parsed.max ? "within_goal" : "above_goal" };
  }
  return nonComparable(parsed);
}

function nonComparable(parsed: ParsedOfficialValue): StatusResult {
  if (parsed.kind === "not_established") {
    return { status: "not_applicable" };
  }
  if (parsed.kind === "conditional") {
    return { status: "unknown", unknownReason: "conditional_value" };
  }
  return { status: "unknown", unknownReason: "unparsable_value" };
}
