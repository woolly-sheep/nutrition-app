import { calculateNutrientIntake } from "../../../domain/nutrient/calculateNutrientIntake";
import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { listMeals } from "../../store/mealStore";
import type { MealRecord, MealType } from "../schemas/meals";

export type DayMealItem = {
  food_id: string;
  display_name: string;
  intake_g: number;
};

export type DayMeal = {
  meal_id: string;
  date: string;
  meal_type: MealType;
  recorded_at: string;
  items: readonly DayMealItem[];
  /** Display-only estimate; null when no energy value is computable. */
  estimated_kcal: number | null;
};

/**
 * Saved meals for one day, enriched for display (UI design v0.5 §2):
 * item display names and a per-meal energy estimate.
 */
export async function listDayMeals(
  date: string,
  seed: Seed = loadSeed(),
  loadMeals: (date: string) => Promise<MealRecord[]> = listMeals,
): Promise<DayMeal[]> {
  const meals = await loadMeals(date);
  return meals.map((meal) => ({
    meal_id: meal.meal_id,
    date: meal.date,
    meal_type: meal.meal_type,
    recorded_at: meal.recorded_at,
    items: meal.items.map((item) => ({
      food_id: item.food_id,
      display_name: displayNameOf(item.food_id, seed),
      intake_g: item.intake_g,
    })),
    estimated_kcal: estimatedKcal(meal, seed),
  }));
}

function displayNameOf(foodId: string, seed: Seed): string {
  return (
    seed.foodMaster.find((food) => food.food_id === foodId)?.display_name ??
    foodId
  );
}

function estimatedKcal(meal: MealRecord, seed: Seed): number | null {
  const calculation = calculateNutrientIntake(
    meal.items.map((item) => ({
      foodId: item.food_id,
      intakeG: item.intake_g,
    })),
    seed.nutrientAmount,
  );
  const energy = calculation.totals.find(
    (total) => total.nutrientCode === "energy_kcal",
  );
  return energy?.totalAmount ?? null;
}
