import { parseOfficialValue } from "../reference/officialValue";
import type { NutrientJudgment } from "../reference/types";

/**
 * Aggregates per-nutrient judgments into the home daily-summary shape
 * (UI design v0.1 §4.1 / exploration 5b): achievements first, then
 * shortfalls ordered largest-first with "あと◯◯" as the single primary
 * figure. Facts only — display wording stays in SafeWordingService.
 */

export type DailySummaryItem = {
  judgment: NutrientJudgment;
  /** intake ÷ reference × 100, only when the reference is an exact number. */
  percentOfReference?: number;
  /** max(0, reference − intake), only when the reference is an exact number. */
  remainingAmount?: number;
};

/**
 * A nutrient whose intake crossed a UL or DG threshold (UI design v0.2
 * addendum §1/§3). Facts only: how far past which threshold.
 */
export type ThresholdExceedance = {
  judgment: NutrientJudgment;
  /** The UL value, or the DG bound (less-than max / range max). */
  thresholdValue: number;
  /** intake − threshold (always > 0 here). */
  overAmount: number;
  /** intake ÷ threshold × 100, for threshold-bar rendering. */
  percentOfThreshold: number;
};

export type DailySummary = {
  /** RDA/AI nutrients with an exact numeric reference, percent descending. */
  comparable: readonly DailySummaryItem[];
  /** comparable subset with percent >= 100 (achievement badges). */
  achieved: readonly DailySummaryItem[];
  /** comparable subset with percent < 100, largest shortfall first. */
  insufficient: readonly DailySummaryItem[];
  /** comparable items at or above 80% (the "できていること" count). */
  atLeast80Count: number;
  /** DG nutrients currently within their goal (目標圏内 n項目). */
  withinGoalCount: number;
  /** UL exceedances (7a section), largest overshoot ratio first. */
  ulReached: readonly ThresholdExceedance[];
  /** DG overages (6b section), largest overshoot ratio first. */
  dgOver: readonly ThresholdExceedance[];
  /** Everything else (UL / DG / reference_only / unknown …) untouched. */
  others: readonly NutrientJudgment[];
};

const INTAKE_REFERENCE_TYPES: ReadonlySet<string> = new Set([
  "recommended_dietary_allowance",
  "adequate_intake",
]);

export function summarizeDailyIntake(
  judgments: readonly NutrientJudgment[],
): DailySummary {
  const comparable: DailySummaryItem[] = [];
  const others: NutrientJudgment[] = [];

  for (const judgment of judgments) {
    const item = toComparableItem(judgment);
    if (item) {
      comparable.push(item);
      continue;
    }
    others.push(judgment);
  }

  comparable.sort(
    (a, b) => (b.percentOfReference ?? 0) - (a.percentOfReference ?? 0),
  );

  const achieved = comparable.filter(
    (item) => (item.percentOfReference ?? 0) >= 100,
  );
  const insufficient = comparable
    .filter((item) => (item.percentOfReference ?? 0) < 100)
    .sort((a, b) => (a.percentOfReference ?? 0) - (b.percentOfReference ?? 0));

  return {
    comparable,
    achieved,
    insufficient,
    atLeast80Count: comparable.filter(
      (item) => (item.percentOfReference ?? 0) >= 80,
    ).length,
    withinGoalCount: others.filter(
      (judgment) => judgment.status === "within_goal",
    ).length,
    ulReached: collectExceedances(others, "above_upper_limit"),
    dgOver: collectExceedances(others, "above_goal"),
    others,
  };
}

function collectExceedances(
  judgments: readonly NutrientJudgment[],
  status: "above_upper_limit" | "above_goal",
): ThresholdExceedance[] {
  return judgments
    .filter((judgment) => judgment.status === status)
    .flatMap((judgment) => {
      const exceedance = toExceedance(judgment);
      return exceedance ? [exceedance] : [];
    })
    .sort((a, b) => b.percentOfThreshold - a.percentOfThreshold);
}

function toExceedance(judgment: NutrientJudgment): ThresholdExceedance | null {
  const threshold = thresholdOf(judgment);
  if (threshold === null || threshold <= 0) {
    return null;
  }
  return {
    judgment,
    thresholdValue: threshold,
    overAmount: judgment.intakeAmount - threshold,
    percentOfThreshold: (judgment.intakeAmount / threshold) * 100,
  };
}

/** The crossed bound: UL value, DG less-than max, or DG range max. */
function thresholdOf(judgment: NutrientJudgment): number | null {
  const parsed = parseOfficialValue(judgment.referenceValue);
  if (parsed.kind === "exact") return parsed.value;
  if (parsed.kind === "less_than") return parsed.max;
  if (parsed.kind === "range") return parsed.max;
  return null;
}

function toComparableItem(
  judgment: NutrientJudgment,
): DailySummaryItem | null {
  if (!INTAKE_REFERENCE_TYPES.has(judgment.referenceType)) {
    return null;
  }
  const parsed = parseOfficialValue(judgment.referenceValue);
  if (parsed.kind !== "exact" || parsed.value <= 0) {
    return null;
  }
  return {
    judgment,
    percentOfReference: (judgment.intakeAmount / parsed.value) * 100,
    remainingAmount: Math.max(0, parsed.value - judgment.intakeAmount),
  };
}
