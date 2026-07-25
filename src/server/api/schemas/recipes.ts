import type { MealItemInput } from "./meals";

/**
 * 料理プリセット (decision-20260725-recipe-presets). A named bundle of seed
 * foods with grams — e.g.「いつもの朝食セット」= 玄米200g + 納豆50g + …。
 * Registered once, then logged into a meal in one tap.
 *
 * Unlike supplement products, a recipe stores NO nutrient values: its foods
 * are real seed items, so nutrition is always recomputed from the frozen seed
 * at log time. This keeps recipes consistent with the seed and avoids storing
 * a value that could diverge from the official table.
 */

export type RecipeItem = MealItemInput; // { food_id, intake_g }

export type Recipe = {
  recipe_id: string;
  /** Dish name as entered by the user (free text). */
  name: string;
  items: readonly RecipeItem[];
  created_at: string;
};

export type CreateRecipeRequest = {
  name: string;
  items: readonly RecipeItem[];
};
