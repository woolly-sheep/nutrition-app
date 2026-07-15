import { deriveUsualFoods } from "../../../domain/meal/deriveUsualFoods";
import { estimateIntakeAmount } from "../../../domain/nutrient/estimateIntakeAmount";
import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { listMeals } from "../../store/mealStore";
import type { MealRecord } from "../schemas/meals";

export type UsualFoodItem = {
  food_id: string;
  display_name: string;
  intake_g: number;
  estimated_kcal: number | null;
  occurrences: number;
};

export type UsualFoodsResponse = {
  meal_type: string;
  items: readonly UsualFoodItem[];
};

const WINDOW_DAYS = 14;

/**
 * いつもの食事 — derived from the last 14 days of records for the given
 * meal type (UI design v0.3 §1). No persisted favorites.
 */
export async function getUsualFoods(
  mealType: string,
  date: string,
  seed: Seed = loadSeed(),
  loadAllMeals: () => Promise<MealRecord[]> = () => listMeals(),
): Promise<UsualFoodsResponse> {
  const windowStart = isoDateDaysBefore(date, WINDOW_DAYS);
  const meals = (await loadAllMeals()).filter(
    (meal) => meal.date >= windowStart && meal.date <= date,
  );

  const usual = deriveUsualFoods(
    meals.map((meal) => ({
      date: meal.date,
      mealType: meal.meal_type,
      items: meal.items.map((item) => ({
        foodId: item.food_id,
        intakeG: item.intake_g,
      })),
    })),
    mealType,
  );

  return {
    meal_type: mealType,
    items: usual.map((food) => ({
      food_id: food.foodId,
      display_name: displayNameOf(food.foodId, seed),
      intake_g: food.intakeG,
      estimated_kcal: estimatedKcal(food.foodId, food.intakeG, seed),
      occurrences: food.occurrences,
    })),
  };
}

function displayNameOf(foodId: string, seed: Seed): string {
  return (
    seed.foodMaster.find((food) => food.food_id === foodId)?.display_name ??
    foodId
  );
}

function estimatedKcal(
  foodId: string,
  intakeG: number,
  seed: Seed,
): number | null {
  const energy = seed.nutrientAmount.find(
    (record) =>
      record.food_id === foodId && record.nutrient_code === "energy_kcal",
  );
  if (typeof energy?.amount_per_100g !== "number") {
    return null;
  }
  return estimateIntakeAmount(intakeG, energy.amount_per_100g);
}

function isoDateDaysBefore(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() - days);
  return base.toISOString().slice(0, 10);
}
