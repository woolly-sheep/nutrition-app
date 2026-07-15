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

const DATA_DIR = path.join(process.cwd(), "data");
const MEALS_FILE = path.join(DATA_DIR, "meals.json");

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

async function readAll(): Promise<MealRecord[]> {
  try {
    const raw = await readFile(MEALS_FILE, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MealRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(meals: readonly MealRecord[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(MEALS_FILE, JSON.stringify(meals, null, 2), "utf-8");
}
