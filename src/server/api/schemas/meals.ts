/**
 * POST /api/meals — save a confirmed meal (explicit grams first).
 * GET  /api/meals?date=YYYY-MM-DD — list saved meals for a day.
 */

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export type MealItemInput = {
  food_id: string;
  /** Always grams. Unit conversions are display support only. */
  intake_g: number;
};

export type CreateMealRequest = {
  date: string; // YYYY-MM-DD
  meal_type: MealType;
  items: readonly MealItemInput[];
};

export type MealRecord = CreateMealRequest & {
  meal_id: string;
  recorded_at: string;
};

export type CreateMealResponse = {
  meal: MealRecord;
};

export type ListMealsResponse = {
  meals: readonly MealRecord[];
};

/** Boundary defense limits — reject absurd payloads before they reach domain. */
export const MAX_ITEMS_PER_MEAL = 50;
export const MAX_INTAKE_G = 5000;
