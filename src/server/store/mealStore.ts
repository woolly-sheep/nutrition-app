import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  CreateMealRequest,
  MealRecord,
} from "../api/schemas/meals";

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

export async function appendMeal(input: CreateMealRequest): Promise<MealRecord> {
  const meal: MealRecord = {
    ...input,
    meal_id: `meal_${randomUUID()}`,
    recorded_at: new Date().toISOString(),
  };
  const meals = await readAll();
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
  try {
    const raw = await readFile(mealsFile(), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MealRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(meals: readonly MealRecord[]): Promise<void> {
  await mkdir(dataDir(), { recursive: true });
  await writeFile(mealsFile(), JSON.stringify(meals, null, 2), "utf-8");
}
