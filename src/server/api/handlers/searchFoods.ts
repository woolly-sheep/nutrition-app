import { loadSeed } from "../../../seed/loadSeed";
import { getEnergyByFoodId, groupUnitConversion } from "../../../seed/seedIndex";
import type { FoodMasterRecord, Seed, UnitConversionRecord } from "../../../seed/types";
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
 * (display_name / official_food_name). At 2,538 foods the result is capped
 * to MAX_RESULTS so the list stays fast to build and render; an empty query
 * returns the first page as a browse view. Lookups go through the memoized
 * seed index (O(1) per food) instead of scanning the 40,608 nutrient rows.
 */
export const MAX_RESULTS = 50;

export function searchFoods(
  query: string,
  seed: Seed = loadSeed(),
  standardWeights: readonly StandardWeightRecord[] = loadStandardWeights(),
): FoodSearchResponse {
  const normalized = query.trim().toLowerCase();
  const energyByFoodId = getEnergyByFoodId(seed);
  const unitByFoodId = groupUnitConversion(seed);
  const weightsByFoodId = groupWeights(standardWeights);

  const matched: FoodMasterRecord[] = [];
  for (const food of seed.foodMaster) {
    if (
      normalized === "" ||
      food.display_name.toLowerCase().includes(normalized) ||
      food.official_food_name.toLowerCase().includes(normalized)
    ) {
      matched.push(food);
      if (matched.length >= MAX_RESULTS) {
        break;
      }
    }
  }

  const foods = matched.map((food) =>
    toSearchItem(food, energyByFoodId, unitByFoodId, weightsByFoodId),
  );
  if (foods.length === 0) {
    return { foods, message: EMPTY_SEARCH_MESSAGE };
  }
  return { foods };
}

function groupWeights(
  standardWeights: readonly StandardWeightRecord[],
): Map<string, StandardWeightRecord[]> {
  const byFoodId = new Map<string, StandardWeightRecord[]>();
  for (const record of standardWeights) {
    const group = byFoodId.get(record.food_id);
    if (group) {
      group.push(record);
    } else {
      byFoodId.set(record.food_id, [record]);
    }
  }
  return byFoodId;
}

function toSearchItem(
  food: FoodMasterRecord,
  energyByFoodId: Map<string, number | null>,
  unitByFoodId: Map<string, UnitConversionRecord[]>,
  weightsByFoodId: Map<string, StandardWeightRecord[]>,
): FoodSearchItem {
  return {
    food_id: food.food_id,
    display_name: food.display_name,
    official_food_name: food.official_food_name,
    energy_kcal_per_100g: energyByFoodId.get(food.food_id) ?? null,
    unit_options: unitOptionsFor(food.food_id, unitByFoodId, weightsByFoodId),
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
  unitByFoodId: Map<string, UnitConversionRecord[]>,
  weightsByFoodId: Map<string, StandardWeightRecord[]>,
): FoodUnitOption[] {
  const options: FoodUnitOption[] = (unitByFoodId.get(foodId) ?? []).map(
    (record) => ({
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

  for (const ref of weightsByFoodId.get(foodId) ?? []) {
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
