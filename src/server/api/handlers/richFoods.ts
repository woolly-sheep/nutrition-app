import {
  topFoodsByNutrient,
  type RichFoodItem,
} from "../../../domain/nutrient/topFoodsByNutrient";
import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";

export type RichFoodsResponse = {
  nutrient_code: string;
  foods: readonly RichFoodItem[];
  /** Fact-only reference, not a recommendation (recommendation boundary). */
  notice: string;
};

export const RICH_FOODS_NOTICE =
  "出典: 食品成分表(八訂)。含有量の多い順の事実表示で、摂取の推奨ではありません";

/** GET /api/foods/rich — foods richest in one nutrient (100gあたり). */
export function richFoods(
  nutrientCode: string,
  seed: Seed = loadSeed(),
): RichFoodsResponse {
  return {
    nutrient_code: nutrientCode,
    foods: topFoodsByNutrient(seed, nutrientCode),
    notice: RICH_FOODS_NOTICE,
  };
}
