import { calculateNutrientIntake } from "../../../domain/nutrient/calculateNutrientIntake";
import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { listRecipes } from "../../store/recipeStore";
import type { Recipe } from "../schemas/recipes";

export type RecipeViewItem = {
  food_id: string;
  display_name: string;
  intake_g: number;
  /** Per-item energy estimate; null when not computable. */
  estimated_kcal: number | null;
};

export type RecipeView = {
  recipe_id: string;
  name: string;
  created_at: string;
  items: readonly RecipeViewItem[];
  /** Display-only estimate for the whole dish; null when not computable. */
  estimated_kcal: number | null;
};

/**
 * Saved recipes enriched for display: item names and a per-recipe energy
 * estimate, both derived from the seed at read time (never stored).
 */
export async function listRecipeViews(
  seed: Seed = loadSeed(),
  loadRecipes: () => Promise<Recipe[]> = listRecipes,
): Promise<RecipeView[]> {
  const recipes = await loadRecipes();
  return recipes.map((recipe) => ({
    recipe_id: recipe.recipe_id,
    name: recipe.name,
    created_at: recipe.created_at,
    items: recipe.items.map((item) => ({
      food_id: item.food_id,
      display_name: displayNameOf(item.food_id, seed),
      intake_g: item.intake_g,
      estimated_kcal: kcalOf(
        [{ foodId: item.food_id, intakeG: item.intake_g }],
        seed,
      ),
    })),
    estimated_kcal: kcalOf(
      recipe.items.map((item) => ({
        foodId: item.food_id,
        intakeG: item.intake_g,
      })),
      seed,
    ),
  }));
}

function displayNameOf(foodId: string, seed: Seed): string {
  return (
    seed.foodMaster.find((food) => food.food_id === foodId)?.display_name ??
    foodId
  );
}

function kcalOf(
  items: readonly { foodId: string; intakeG: number }[],
  seed: Seed,
): number | null {
  const calculation = calculateNutrientIntake(items, seed.nutrientAmount);
  const energy = calculation.totals.find(
    (total) => total.nutrientCode === "energy_kcal",
  );
  return energy?.totalAmount ?? null;
}
