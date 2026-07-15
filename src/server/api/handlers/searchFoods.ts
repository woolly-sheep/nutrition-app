import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
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
): FoodSearchResponse {
  const normalized = query.trim().toLowerCase();
  const matched = seed.foodMaster.filter(
    (food) =>
      normalized === "" ||
      food.display_name.toLowerCase().includes(normalized) ||
      food.official_food_name.toLowerCase().includes(normalized),
  );

  const foods = matched.map((food) => toSearchItem(food.food_id, seed));
  if (foods.length === 0) {
    return { foods, message: EMPTY_SEARCH_MESSAGE };
  }
  return { foods };
}

function toSearchItem(foodId: string, seed: Seed): FoodSearchItem {
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
    unit_options: unitOptionsFor(foodId, seed),
  };
}

function unitOptionsFor(foodId: string, seed: Seed): FoodUnitOption[] {
  return seed.unitConversion
    .filter((record) => record.food_id === foodId)
    .map((record) => ({
      display_unit: record.display_unit,
      representative_weight_g:
        typeof record.representative_weight_g === "number"
          ? record.representative_weight_g
          : null,
      confidence_level: record.confidence_level,
      warning_code: record.warning_code,
    }));
}
