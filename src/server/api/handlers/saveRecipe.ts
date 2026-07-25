import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { appendRecipe } from "../../store/recipeStore";
import type { ProblemDetails } from "../errors/problem";
import { validationProblem } from "../errors/problem";
import type { CreateRecipeRequest, Recipe } from "../schemas/recipes";
import { validateItems } from "./createMeal";

export type SaveRecipeResult =
  | { ok: true; recipe: Recipe }
  | { ok: false; problem: ProblemDetails };

const MAX_NAME_LEN = 100;

/**
 * Validates and saves one recipe preset. The dish name is user data, so
 * validation errors return field codes only, never the name. Items reuse the
 * same rules as saving a meal (known seed food, positive grams, item caps).
 */
export async function saveRecipe(
  body: unknown,
  seed: Seed = loadSeed(),
  save: (input: CreateRecipeRequest) => Promise<Recipe> = appendRecipe,
): Promise<SaveRecipeResult> {
  const validated = validateRecipeBody(body, seed);
  if (!validated.ok) {
    return validated;
  }
  const recipe = await save(validated.value);
  return { ok: true, recipe };
}

type ValidatedRecipe =
  | { ok: true; value: CreateRecipeRequest }
  | { ok: false; problem: ProblemDetails };

/**
 * Shared validation for the create and edit paths. The dish name is user data,
 * so failures return field codes only (never the name); items reuse the meal
 * item rules (known seed food, positive grams, item caps).
 */
export function validateRecipeBody(body: unknown, seed: Seed): ValidatedRecipe {
  if (typeof body !== "object" || body === null) {
    return { ok: false, problem: validationProblem(["invalid_body"]) };
  }
  const { name, items } = body as Record<string, unknown>;
  const errors: string[] = [];

  if (
    typeof name !== "string" ||
    name.trim() === "" ||
    name.length > MAX_NAME_LEN
  ) {
    errors.push("invalid_name");
  }
  errors.push(...validateItems(items, seed));

  if (errors.length > 0) {
    return { ok: false, problem: validationProblem(errors) };
  }

  return {
    ok: true,
    value: {
      name: (name as string).trim(),
      items: (items as CreateRecipeRequest["items"]).map((item) => ({
        food_id: item.food_id,
        intake_g: item.intake_g,
      })),
    },
  };
}
