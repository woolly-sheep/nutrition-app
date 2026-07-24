import { nutrientContribution } from "../../../domain/analysis/nutrientContribution";
import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { listMeals } from "../../store/mealStore";
import type { MealRecord } from "../schemas/meals";
import {
  DATA_SOURCES,
  type ContributionFoodItem,
  type NutrientContributionResponse,
} from "../schemas/analysis";

export const CONTRIBUTION_NOTICE =
  "出典: 食品成分表(八訂)。記録した食品の含有量に基づく内訳の推定です。";

type Dependencies = {
  seed?: Seed;
  loadMeals?: (date: string) => Promise<MealRecord[]>;
};

/**
 * For one nutrient, which recorded foods contributed it today
 * (dashboard insight ②). Facts from the user's own records — the
 * food-derived share only, largest first. No profile / reference needed:
 * this explains where intake came from, it does not judge sufficiency.
 * Never log the food contents here (logging allowlist).
 */
export async function getNutrientContribution(
  date: string,
  nutrientCode: string,
  { seed = loadSeed(), loadMeals = listMeals }: Dependencies = {},
): Promise<NutrientContributionResponse> {
  const meta = nutrientMeta(nutrientCode, seed);
  const empty: NutrientContributionResponse = {
    date,
    nutrient_code: nutrientCode,
    nutrient_name: meta.name,
    unit: meta.unit,
    has_records: false,
    total_amount: 0,
    foods: [],
    other_amount: 0,
    other_percent: 0,
    notice: CONTRIBUTION_NOTICE,
    sources: DATA_SOURCES,
  };

  const meals = await loadMeals(date);
  const items = meals.flatMap((meal) =>
    meal.items.map((item) => ({
      foodId: item.food_id,
      intakeG: item.intake_g,
    })),
  );
  if (items.length === 0) {
    return empty;
  }

  const contribution = nutrientContribution(
    items,
    nutrientCode,
    seed.nutrientAmount,
  );

  const foods: ContributionFoodItem[] = contribution.top.map((entry) => ({
    food_id: entry.foodId,
    display_name: displayNameOf(entry.foodId, seed),
    amount: entry.amount,
    percent: entry.percent,
  }));

  return {
    date,
    nutrient_code: nutrientCode,
    nutrient_name: meta.name,
    unit: meta.unit,
    has_records: true,
    total_amount: contribution.totalAmount,
    foods,
    other_amount: contribution.otherAmount,
    other_percent: contribution.otherPercent,
    notice: CONTRIBUTION_NOTICE,
    sources: DATA_SOURCES,
  };
}

function nutrientMeta(
  nutrientCode: string,
  seed: Seed,
): { name: string; unit: string } {
  const record = seed.nutrientAmount.find(
    (entry) => entry.nutrient_code === nutrientCode,
  );
  return {
    name: record?.nutrient_name ?? nutrientCode,
    unit: record?.unit ?? "",
  };
}

function displayNameOf(foodId: string, seed: Seed): string {
  return (
    seed.foodMaster.find((food) => food.food_id === foodId)?.display_name ??
    foodId
  );
}
