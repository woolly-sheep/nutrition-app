import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { updateRecipeRecord } from "../../store/recipeStore";
import type { ProblemDetails } from "../errors/problem";
import type { CreateRecipeRequest, Recipe } from "../schemas/recipes";
import { validateRecipeBody } from "./saveRecipe";

export type UpdateRecipeResult =
  | { ok: true; recipe: Recipe }
  | { ok: false; problem: ProblemDetails };

/**
 * Replaces one recipe's name and items (issue: recipe editing). Same rules as
 * saving; the recipe keeps its id and created_at. Unknown id is a 404.
 */
export async function updateRecipe(
  recipeId: string,
  body: unknown,
  seed: Seed = loadSeed(),
  persist: (
    id: string,
    input: CreateRecipeRequest,
  ) => Promise<Recipe | null> = updateRecipeRecord,
): Promise<UpdateRecipeResult> {
  const validated = validateRecipeBody(body, seed);
  if (!validated.ok) {
    return validated;
  }

  const recipe = await persist(recipeId, validated.value);
  if (recipe === null) {
    return {
      ok: false,
      problem: {
        type: "about:blank",
        title: "指定された料理が見つかりません。",
        status: 404,
      },
    };
  }
  return { ok: true, recipe };
}
