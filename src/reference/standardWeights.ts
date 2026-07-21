import standardWeightReference from "./standard-weight-reference.json";

/**
 * Standard weight reference — typical per-piece weights (1個/1枚/1本 …) for
 * counting foods, so amounts can be entered by count instead of weighing.
 *
 * This is NOT part of the frozen official seed. Per-piece weight is a
 * physical quantity that the food composition table does not provide and
 * that cannot be derived from nutrient values. Values here are estimates
 * compiled from publicly published portion tables, kept separate from
 * seed/frozen/* and always shown as 推定 (see
 * docs/decisions/decision-20260721-standard-weight-reference.md).
 */

export type StandardWeightRecord = {
  food_id: string;
  /** Matches seed unit-conversion display_unit style, e.g. "1個" / "1枚". */
  display_unit: string;
  typical_weight_g: number;
  confidence: string;
  source: string;
};

export function loadStandardWeights(): readonly StandardWeightRecord[] {
  return standardWeightReference as StandardWeightRecord[];
}
