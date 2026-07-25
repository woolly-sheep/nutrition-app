import {
  topFoodsByNutrient,
  type RichFoodItem,
} from "../../../domain/nutrient/topFoodsByNutrient";
import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { listMeals } from "../../store/mealStore";
import type { MealRecord } from "../schemas/meals";

export type RichFoodsScope = "all" | "history";

export type RichFoodsResponse = {
  nutrient_code: string;
  scope: RichFoodsScope;
  foods: readonly RichFoodItem[];
  /** Fact-only reference, not a recommendation (recommendation boundary). */
  notice: string;
};

export const RICH_FOODS_NOTICE =
  "出典: 食品成分表(八訂)。含有量の多い順の事実表示で、摂取の推奨ではありません";

export const RICH_FOODS_HISTORY_NOTICE =
  "出典: 食品成分表(八訂)。過去1年に記録した食材のうち、含有量の多い順の事実表示で、摂取の推奨ではありません";

/** History scope looks back this many days over the user's own records. */
export const RICH_FOODS_HISTORY_DAYS = 365;

type Dependencies = {
  seed?: Seed;
  loadMeals?: (date?: string) => Promise<MealRecord[]>;
  now?: () => Date;
};

/**
 * GET /api/foods/rich — foods richest in one nutrient (100gあたり).
 * scope="all" (default) ranks the whole catalog; scope="history" ranks only
 * foods the user has actually eaten in the last year, so suggestions are
 * things they can realistically get (issue #28 follow-up). Fact-only.
 */
export async function richFoods(
  nutrientCode: string,
  scope: RichFoodsScope = "all",
  {
    seed = loadSeed(),
    loadMeals = listMeals,
    now = () => new Date(),
  }: Dependencies = {},
): Promise<RichFoodsResponse> {
  if (scope === "history") {
    const allowed = await eatenFoodIds(loadMeals, now());
    return {
      nutrient_code: nutrientCode,
      scope,
      foods: topFoodsByNutrient(seed, nutrientCode, 30, allowed),
      notice: RICH_FOODS_HISTORY_NOTICE,
    };
  }
  return {
    nutrient_code: nutrientCode,
    scope: "all",
    foods: topFoodsByNutrient(seed, nutrientCode),
    notice: RICH_FOODS_NOTICE,
  };
}

/** Distinct food_ids recorded within the history window (inclusive). */
async function eatenFoodIds(
  loadMeals: (date?: string) => Promise<MealRecord[]>,
  now: Date,
): Promise<ReadonlySet<string>> {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - (RICH_FOODS_HISTORY_DAYS - 1));
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const meals = await loadMeals();
  const ids = new Set<string>();
  for (const meal of meals) {
    if (meal.date >= cutoffIso) {
      for (const item of meal.items) {
        ids.add(item.food_id);
      }
    }
  }
  return ids;
}
