import { randomUUID } from "node:crypto";
import path from "node:path";
import type {
  CreateMealRequest,
  MealRecord,
} from "../api/schemas/meals";
import { readJsonArray, writeJsonArray } from "./jsonArrayStore";

/**
 * MVP persistence: a local JSON file (data/meals.json). Single-user,
 * no auth yet — swap for a real store before multi-user. The file lives
 * outside src and is gitignored; never log its contents.
 */

/** Resolved per call so tests can point NUTRITION_DATA_DIR at a temp dir. */
function dataDir(): string {
  return process.env.NUTRITION_DATA_DIR ?? path.join(process.cwd(), "data");
}

function mealsFile(): string {
  return path.join(dataDir(), "meals.json");
}

export async function listMeals(date?: string): Promise<MealRecord[]> {
  const meals = await readAll();
  if (!date) {
    return meals;
  }
  return meals.filter((meal) => meal.date === date);
}

/**
 * Records a meal. When the same day already has a meal of this type, the new
 * items are folded into that existing record instead of creating a second
 * card (one 区分 = one block). The original meal_id / recorded_at are kept so
 * the block keeps its identity; only when no block exists yet is a new one
 * created.
 */
export async function appendMeal(input: CreateMealRequest): Promise<MealRecord> {
  const meals = await readAll();
  const existingIndex = meals.findIndex(
    (meal) => meal.date === input.date && meal.meal_type === input.meal_type,
  );

  if (existingIndex !== -1) {
    const existing = meals[existingIndex];
    const merged: MealRecord = {
      ...existing,
      items: [...existing.items, ...input.items],
    };
    const next = [...meals];
    next[existingIndex] = merged;
    await writeAll(next);
    return merged;
  }

  const meal: MealRecord = {
    ...input,
    meal_id: `meal_${randomUUID()}`,
    recorded_at: new Date().toISOString(),
  };
  await writeAll([...meals, meal]);
  return meal;
}

/**
 * Replaces one meal's items (grams fixes / item removal — UI design
 * v0.7). Date, meal type, and timestamps stay untouched.
 * Returns the updated record, or null when the id does not exist.
 */
export async function updateMealItems(
  mealId: string,
  items: CreateMealRequest["items"],
): Promise<MealRecord | null> {
  const meals = await readAll();
  const index = meals.findIndex((meal) => meal.meal_id === mealId);
  if (index === -1) {
    return null;
  }
  const updated: MealRecord = { ...meals[index], items };
  const next = [...meals];
  next[index] = updated;
  await writeAll(next);
  return updated;
}

/** Removes one meal. Returns false when the id does not exist. */
export async function deleteMeal(mealId: string): Promise<boolean> {
  const meals = await readAll();
  const remaining = meals.filter((meal) => meal.meal_id !== mealId);
  if (remaining.length === meals.length) {
    return false;
  }
  await writeAll(remaining);
  return true;
}

/** Replaces the whole meals file (backup restore). Caller validates first. */
export async function replaceAllMeals(
  meals: readonly MealRecord[],
): Promise<void> {
  await writeAll(meals);
}

async function readAll(): Promise<MealRecord[]> {
  return readJsonArray<MealRecord>(mealsFile());
}

async function writeAll(meals: readonly MealRecord[]): Promise<void> {
  await writeJsonArray(mealsFile(), meals);
}
