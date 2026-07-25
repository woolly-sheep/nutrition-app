import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CreateRecipeRequest, Recipe } from "../api/schemas/recipes";

/**
 * MVP persistence for recipe presets (data/recipes.json). Same lifecycle as
 * the other stores: single-user, local, gitignored, never logged.
 */

function dataDir(): string {
  return process.env.NUTRITION_DATA_DIR ?? path.join(process.cwd(), "data");
}

function recipesFile(): string {
  return path.join(dataDir(), "recipes.json");
}

async function readAll(): Promise<Recipe[]> {
  try {
    const raw = await readFile(recipesFile(), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Recipe[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(records: readonly Recipe[]): Promise<void> {
  await mkdir(dataDir(), { recursive: true });
  await writeFile(recipesFile(), JSON.stringify(records, null, 2), "utf-8");
}

export async function listRecipes(): Promise<Recipe[]> {
  return readAll();
}

export async function appendRecipe(
  input: CreateRecipeRequest,
): Promise<Recipe> {
  const recipe: Recipe = {
    ...input,
    recipe_id: `rec_${randomUUID()}`,
    created_at: new Date().toISOString(),
  };
  const records = await readAll();
  await writeAll([...records, recipe]);
  return recipe;
}

export async function deleteRecipe(id: string): Promise<boolean> {
  const records = await readAll();
  const next = records.filter((r) => r.recipe_id !== id);
  if (next.length === records.length) {
    return false;
  }
  await writeAll(next);
  return true;
}

export async function replaceAllRecipes(
  records: readonly Recipe[],
): Promise<void> {
  await writeAll(records);
}
