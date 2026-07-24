import type { SupplementRecord } from "../../server/api/schemas/supplements";

/**
 * Sums self-reported supplement amounts per nutrient across a day's
 * records. Kept apart from calculateNutrientIntake (food) so the daily
 * analysis can present the two sources separately and never merge a
 * self-reported value into an official one.
 */
export function sumSupplementIntake(
  supplements: readonly SupplementRecord[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const record of supplements) {
    for (const entry of record.amounts) {
      if (!Number.isFinite(entry.amount) || entry.amount <= 0) {
        continue;
      }
      totals.set(
        entry.nutrient_code,
        (totals.get(entry.nutrient_code) ?? 0) + entry.amount,
      );
    }
  }
  return totals;
}

/** Merges food + supplement totals into one map (for reference judgment). */
export function combineIntake(
  food: ReadonlyMap<string, number>,
  supplement: ReadonlyMap<string, number>,
): Map<string, number> {
  const combined = new Map(food);
  for (const [code, amount] of supplement) {
    combined.set(code, (combined.get(code) ?? 0) + amount);
  }
  return combined;
}
