import { nutrientContribution } from "../../../domain/analysis/nutrientContribution";
import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { listMeals } from "../../store/mealStore";
import type { MealRecord } from "../schemas/meals";
import {
  DATA_SOURCES,
  type ContributionFoodItem,
  type ContributionWindow,
  type NutrientContributionResponse,
} from "../schemas/analysis";

export const CONTRIBUTION_NOTICE =
  "出典: 食品成分表(八訂)。記録した食品の含有量に基づく内訳の推定です。";

export const CONTRIBUTION_YEAR_NOTICE =
  "出典: 食品成分表(八訂)。過去1年に記録した食品の含有量に基づく内訳の推定です。";

/** The "year" window looks back this many days, inclusive of `date`. */
export const CONTRIBUTION_YEAR_DAYS = 365;

type Dependencies = {
  seed?: Seed;
  loadMeals?: (date?: string) => Promise<MealRecord[]>;
};

/**
 * For one nutrient, which recorded foods contributed it (dashboard insight ②).
 * window="day" explains a single date's intake (where a shortfall came from);
 * window="year" aggregates the trailing 365 days ending at `date`, so an
 * over-consumed nutrient's habitual food sources surface (issue #28 ①).
 * Facts from the user's own records — food-derived share only, largest first.
 * No judgment. Never log the food contents here (logging allowlist).
 */
export async function getNutrientContribution(
  date: string,
  nutrientCode: string,
  window: ContributionWindow = "day",
  { seed = loadSeed(), loadMeals = listMeals }: Dependencies = {},
): Promise<NutrientContributionResponse> {
  const meta = nutrientMeta(nutrientCode, seed);
  const notice =
    window === "year" ? CONTRIBUTION_YEAR_NOTICE : CONTRIBUTION_NOTICE;
  const empty: NutrientContributionResponse = {
    date,
    window,
    nutrient_code: nutrientCode,
    nutrient_name: meta.name,
    unit: meta.unit,
    has_records: false,
    total_amount: 0,
    foods: [],
    other_amount: 0,
    other_percent: 0,
    notice,
    sources: DATA_SOURCES,
  };

  const meals =
    window === "year"
      ? withinYear(await loadMeals(), date)
      : await loadMeals(date);
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
    window,
    nutrient_code: nutrientCode,
    nutrient_name: meta.name,
    unit: meta.unit,
    has_records: true,
    total_amount: contribution.totalAmount,
    foods,
    other_amount: contribution.otherAmount,
    other_percent: contribution.otherPercent,
    notice,
    sources: DATA_SOURCES,
  };
}

/** Meals dated within the trailing 365 days ending at `endDate` (inclusive). */
function withinYear(
  meals: readonly MealRecord[],
  endDate: string,
): MealRecord[] {
  const end = new Date(`${endDate}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (CONTRIBUTION_YEAR_DAYS - 1));
  const startIso = start.toISOString().slice(0, 10);
  return meals.filter(
    (meal) => meal.date >= startIso && meal.date <= endDate,
  );
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
