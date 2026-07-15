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
    others,
  };
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
