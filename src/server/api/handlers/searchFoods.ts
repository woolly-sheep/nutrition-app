import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import {
  loadStandardWeights,
  type StandardWeightRecord,
} from "../../../reference/standardWeights";
import {
  EMPTY_SEARCH_MESSAGE,
  type FoodSearchItem,
  type FoodSearchResponse,
  type FoodUnitOption,
} from "../schemas/foods";

/**
 * Case-insensitive substring search over the frozen FoodMaster
 * (display_name / official_food_name). Empty query returns the full
 * MVP catalog so the record tab can browse the 40 foods.
 */
export function searchFoods(
  query: string,
  seed: Seed = loadSeed(),
  standardWeights: readonly StandardWeightRecord[] = loadStandardWeights(),
): FoodSearchResponse {
  const normalized = query.trim().toLowerCase();
  const matched = seed.foodMaster.filter(
    (food) =>
      normalized === "" ||
      food.display_name.toLowerCase().includes(normalized) ||
      food.official_food_name.toLowerCase().includes(normalized),
  );

  const foods = matched.map((food) =>
    toSearchItem(food.food_id, seed, standardWeights),
  );
  if (foods.length === 0) {
    return { foods, message: EMPTY_SEARCH_MESSAGE };
  }
  return { foods };
}

function toSearchItem(
  foodId: string,
  seed: Seed,
  standardWeights: readonly StandardWeightRecord[],
): FoodSearchItem {
  const master = seed.foodMaster.find((food) => food.food_id === foodId);
  const energy = seed.nutrientAmount.find(
    (record) =>
      record.food_id === foodId && record.nutrient_code === "energy_kcal",
  );

  return {
    food_id: foodId,
    display_name: master?.display_name ?? foodId,
    official_food_name: master?.official_food_name ?? "",
    energy_kcal_per_100g:
      typeof energy?.amount_per_100g === "number"
        ? energy.amount_per_100g
        : null,
    unit_options: unitOptionsFor(foodId, seed, standardWeights),
  };
}

/**
 * Seed unit options first, then fill/extend with standard weight estimates:
 * a reference value fills a seed unit whose official weight is null (e.g.
 * 卵 1個), and adds units the seed does not list. Seed numeric values always
 * win — the reference never overwrites an official weight.
 */
function unitOptionsFor(
  foodId: string,
  seed: Seed,
  standardWeights: readonly StandardWeightRecord[],
): FoodUnitOption[] {
  const options: FoodUnitOption[] = seed.unitConversion
    .filter((record) => record.food_id === foodId)
    .map((record) => ({
      display_unit: record.display_unit,
      representative_weight_g:
        typeof record.representative_weight_g === "number"
          ? record.representative_weight_g
          : null,
      confidence_level: record.confidence_level,
      warning_code: record.warning_code,
      source: "official_seed" as const,
      source_note: null,
    }));

  for (const ref of standardWeights.filter((r) => r.food_id === foodId)) {
    const existing = options.find(
      (option) => option.display_unit === ref.display_unit,
    );
    if (existing) {
      // Only fill a gap; never overwrite an official numeric weight.
      if (existing.representative_weight_g === null) {
        existing.representative_weight_g = ref.typical_weight_g;
        existing.confidence_level = ref.confidence;
        existing.source = "reference_estimate";
        existing.source_note = ref.source;
      }
    } else {
      options.push({
        display_unit: ref.display_unit,
        representative_weight_g: ref.typical_weight_g,
        confidence_level: ref.confidence,
        warning_code: null,
        source: "reference_estimate",
        source_note: ref.source,
      });
    }
  }

  return options;
}
