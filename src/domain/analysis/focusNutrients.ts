import { parseOfficialValue } from "../reference/officialValue";
import type { JudgmentStatus, NutrientJudgment } from "../reference/types";

/**
 * 重点栄養素 (focus nutrients) — the nutrients the 食事摂取基準(2025) itself
 * assigns a 目標量(DG) to, i.e. the standard's own designation of nutrients
 * tied to 生活習慣病の発症予防. This is the only "重点" definition that is
 * fully sourced from the frozen seed (reference_type), so it stays within
 * the fact-only policy: no invented health-importance ranking.
 *
 * The home flower shows six category averages; this board shows each DG
 * nutrient individually so an important one is never hidden in an average
 * (issue #34). Facts only — display wording stays in SafeWordingService.
 */

export type FocusDirection = "gain" | "balance" | "limit";

export type FocusNutrient = {
  nutrientCode: string;
  nutrientName: string;
  /** g / mg for gain·limit, "%E" for balance. */
  unit: string;
  direction: FocusDirection;
  status: JudgmentStatus;
  /**
   * Intake toward the goal — grams/mg for gain·limit, the estimated energy
   * share (%E) for balance. null when it cannot be computed (e.g. no energy
   * intake that day, so the %E share is unknown).
   */
  value: number | null;
  /** The DG bound: minimum for gain, maximum for limit; null for balance. */
  goalValue: number | null;
  /** Energy-share goal range (balance only). */
  rangeMin?: number;
  rangeMax?: number;
  /**
   * Progress 0..1+ toward the bound (gain: value/min, limit: value/max).
   * null for balance (a range, not a single fill) and when value is unknown.
   */
  fillRatio: number | null;
  /** Goal met: at/over the minimum, within the range, or under the limit. */
  reached: boolean;
  /**
   * Amount still to the goal (gain) or headroom under the limit (limit),
   * never negative; null for balance and when value is unknown.
   */
  remaining: number | null;
};

/** Home order: things to reach first, then balance, then the one limit. */
const DIRECTION_RANK: Record<FocusDirection, number> = {
  gain: 0,
  balance: 1,
  limit: 2,
};

const CODE_ORDER = [
  "dietary_fiber_g",
  "potassium_mg",
  "protein_g",
  "fat_g",
  "carbohydrate_g",
  "salt_equivalent_g",
];

/**
 * Builds the focus board from the day's judgments. Only 目標量(DG) records
 * contribute; each is classified by how its official value reads:
 *   「◯以上」 → gain (reach the minimum)
 *   %E range → balance (stay within the energy-share range)
 *   「◯未満」 → limit (stay under the maximum)
 */
export function buildFocusNutrients(
  judgments: readonly NutrientJudgment[],
): readonly FocusNutrient[] {
  const focus: FocusNutrient[] = [];

  for (const judgment of judgments) {
    if (judgment.referenceType !== "tentative_dietary_goal") {
      continue;
    }
    const item = toFocusNutrient(judgment);
    if (item) {
      focus.push(item);
    }
  }

  return focus.sort((a, b) => {
    const byDirection = DIRECTION_RANK[a.direction] - DIRECTION_RANK[b.direction];
    if (byDirection !== 0) return byDirection;
    return rankOf(a.nutrientCode) - rankOf(b.nutrientCode);
  });
}

function rankOf(code: string): number {
  const index = CODE_ORDER.indexOf(code);
  return index === -1 ? CODE_ORDER.length : index;
}

function toFocusNutrient(judgment: NutrientJudgment): FocusNutrient | null {
  const parsed = parseOfficialValue(judgment.referenceValue);
  const reached = judgment.status === "within_goal";
  const base = {
    nutrientCode: judgment.nutrientCode,
    nutrientName: judgment.nutrientName,
    status: judgment.status,
    reached,
  };

  // %E-range balance (protein / fat / carbohydrate): judged on the energy
  // share, which is only known when the day has a computable energy intake.
  if (parsed.kind === "range" && judgment.energyRatioPercent !== undefined) {
    return {
      ...base,
      unit: "%E",
      direction: "balance",
      value: judgment.energyRatioPercent,
      goalValue: null,
      rangeMin: parsed.min,
      rangeMax: parsed.max,
      fillRatio: null,
      remaining: null,
    };
  }
  // Same nutrients on a day with no energy intake — show the row, no share.
  if (parsed.kind === "range") {
    return {
      ...base,
      unit: "%E",
      direction: "balance",
      value: null,
      goalValue: null,
      rangeMin: parsed.min,
      rangeMax: parsed.max,
      fillRatio: null,
      remaining: null,
    };
  }

  if (parsed.kind === "at_least" && parsed.min > 0) {
    return {
      ...base,
      unit: judgment.unit,
      direction: "gain",
      value: judgment.intakeAmount,
      goalValue: parsed.min,
      fillRatio: judgment.intakeAmount / parsed.min,
      remaining: Math.max(0, parsed.min - judgment.intakeAmount),
    };
  }

  if (parsed.kind === "less_than" && parsed.max > 0) {
    return {
      ...base,
      unit: judgment.unit,
      direction: "limit",
      value: judgment.intakeAmount,
      goalValue: parsed.max,
      fillRatio: judgment.intakeAmount / parsed.max,
      remaining: Math.max(0, parsed.max - judgment.intakeAmount),
    };
  }

  return null;
}
