import type { NutrientAmountRecord } from "../../seed/types";

/**
 * NutrientContribution — for one nutrient, which recorded foods it came
 * from today, largest first (dashboard insight ②,
 * decision-20260724-dashboard-insights).
 *
 * Facts only, from the user's own records: official composition
 * (amount_per_100g) × recorded grams, summed per food. No recommendation,
 * no effect claim. Non-numeric official values are skipped, never guessed
 * (same rule as calculateNutrientIntake). Supplements are out of scope
 * here — this explains the food-derived share.
 */

export type ContributionItem = {
  foodId: string;
  /** Nutrient amount this food contributed (official composition × grams). */
  amount: number;
  /** amount ÷ total × 100. */
  percent: number;
};

export type NutrientContribution = {
  nutrientCode: string;
  /** Total food-derived amount of this nutrient today. */
  totalAmount: number;
  /** Top contributors, largest first (at most maxItems). */
  top: readonly ContributionItem[];
  /** Combined amount of everything beyond the top items. */
  otherAmount: number;
  /** otherAmount ÷ total × 100 (0 when nothing remains). */
  otherPercent: number;
};

export const DEFAULT_CONTRIBUTION_ITEMS = 3;

export function nutrientContribution(
  items: readonly { foodId: string; intakeG: number }[],
  nutrientCode: string,
  nutrientAmounts: readonly NutrientAmountRecord[],
  maxItems: number = DEFAULT_CONTRIBUTION_ITEMS,
): NutrientContribution {
  const per100gByFood = new Map<string, number>();
  for (const record of nutrientAmounts) {
    if (
      record.nutrient_code === nutrientCode &&
      typeof record.amount_per_100g === "number"
    ) {
      per100gByFood.set(record.food_id, record.amount_per_100g);
    }
  }

  const amountByFood = new Map<string, number>();
  for (const item of items) {
    if (!Number.isFinite(item.intakeG) || item.intakeG <= 0) {
      continue;
    }
    const per100g = per100gByFood.get(item.foodId);
    if (per100g === undefined) {
      continue;
    }
    const amount = (item.intakeG * per100g) / 100;
    amountByFood.set(item.foodId, (amountByFood.get(item.foodId) ?? 0) + amount);
  }

  const ranked = [...amountByFood.entries()]
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);
  const totalAmount = ranked.reduce((sum, [, amount]) => sum + amount, 0);

  const top = ranked.slice(0, maxItems).map(([foodId, amount]) => ({
    foodId,
    amount,
    percent: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
  }));
  const otherAmount = ranked
    .slice(maxItems)
    .reduce((sum, [, amount]) => sum + amount, 0);

  return {
    nutrientCode,
    totalAmount,
    top,
    otherAmount,
    otherPercent: totalAmount > 0 ? (otherAmount / totalAmount) * 100 : 0,
  };
}
