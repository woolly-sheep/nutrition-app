import type { SupplementAmount } from "../../server/api/schemas/supplements";

/**
 * Tolerable upper limits that the DRI 2025 report defines specifically for
 * intake from sources OTHER than ordinary food (supplements, fortified
 * products). These are compared against the SUPPLEMENT-only total, never
 * against food or the combined total — a food-based intake is outside their
 * scope by definition (decision-20260724-supplement-intake).
 *
 * Only magnesium qualifies among the seeded nutrients: its ordinary-food UL
 * is "not_established" and the footnote sets 350 mg/日 for 通常の食品以外
 * (報告書 p.284 表脚注1). Every other UL in the seed applies to total
 * intake and is handled by the normal judgment path on the combined total.
 *
 * The value is an official published threshold, not a seed composition
 * value being recalculated, so it lives here with its citation rather than
 * as a frozen-seed row (which stores it as not_established on purpose).
 */
export type NonFoodUpperLimit = {
  nutrientCode: string;
  nutrientName: string;
  unit: string;
  /** Adult limit for non-food intake, per day. */
  value: number;
  /** Official citation for the value. */
  source: string;
};

export const NON_FOOD_UPPER_LIMITS: readonly NonFoodUpperLimit[] = [
  {
    nutrientCode: "magnesium_mg",
    nutrientName: "マグネシウム",
    unit: "mg",
    value: 350,
    source: "MHLW DRI 2025 macro-mineral 報告書 p.284 表脚注1",
  },
];

export type NonFoodLimitStatus = {
  nutrientCode: string;
  nutrientName: string;
  unit: string;
  /** Supplement-only intake for this nutrient. */
  supplementAmount: number;
  limit: number;
  /** intake ÷ limit × 100. */
  percentOfLimit: number;
  /** True when the supplement-only intake exceeds the non-food limit. */
  exceeded: boolean;
  source: string;
};

/**
 * Evaluates the non-food ULs against supplement-only intake. Returns a
 * status only for nutrients the user actually took as a supplement, so the
 * section stays empty until it is relevant.
 */
export function evaluateNonFoodLimits(
  supplementByCode: ReadonlyMap<string, number>,
): NonFoodLimitStatus[] {
  const results: NonFoodLimitStatus[] = [];
  for (const limit of NON_FOOD_UPPER_LIMITS) {
    const supplementAmount = supplementByCode.get(limit.nutrientCode);
    if (supplementAmount === undefined || supplementAmount <= 0) {
      continue;
    }
    results.push({
      nutrientCode: limit.nutrientCode,
      nutrientName: limit.nutrientName,
      unit: limit.unit,
      supplementAmount,
      limit: limit.value,
      percentOfLimit: (supplementAmount / limit.value) * 100,
      exceeded: supplementAmount > limit.value,
      source: limit.source,
    });
  }
  return results;
}

/** Amounts array → per-code map (drops non-positive / duplicate-safe). */
export function supplementAmountsToMap(
  amounts: readonly SupplementAmount[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of amounts) {
    if (Number.isFinite(entry.amount) && entry.amount > 0) {
      map.set(entry.nutrient_code, (map.get(entry.nutrient_code) ?? 0) + entry.amount);
    }
  }
  return map;
}
