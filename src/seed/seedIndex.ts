import type { Seed, UnitConversionRecord } from "./types";

/**
 * Memoized energy lookup over the seed. At 40,608 nutrient rows, the
 * per-food energy `.find` in the search path is O(n); this Map makes it
 * O(1). Cached by the nutrientAmount array reference (loadSeed returns a
 * stable rehydrated array), so repeated searches reuse the same index.
 *
 * unitConversion is tiny, so it is grouped per call (groupUnitConversion)
 * rather than cached — that keeps the cache keyed on one array only and
 * avoids stale unit data when a caller swaps unitConversion.
 */
const energyCache = new WeakMap<object, Map<string, number | null>>();

export function getEnergyByFoodId(seed: Seed): Map<string, number | null> {
  const key = seed.nutrientAmount as unknown as object;
  const cached = energyCache.get(key);
  if (cached) {
    return cached;
  }
  const energyByFoodId = new Map<string, number | null>();
  for (const record of seed.nutrientAmount) {
    if (record.nutrient_code === "energy_kcal") {
      energyByFoodId.set(
        record.food_id,
        typeof record.amount_per_100g === "number"
          ? record.amount_per_100g
          : null,
      );
    }
  }
  energyCache.set(key, energyByFoodId);
  return energyByFoodId;
}

export function groupUnitConversion(
  seed: Seed,
): Map<string, UnitConversionRecord[]> {
  const byFoodId = new Map<string, UnitConversionRecord[]>();
  for (const record of seed.unitConversion) {
    const group = byFoodId.get(record.food_id);
    if (group) {
      group.push(record);
    } else {
      byFoodId.set(record.food_id, [record]);
    }
  }
  return byFoodId;
}
