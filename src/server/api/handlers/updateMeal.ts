import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { updateMealItems } from "../../store/mealStore";
import type { ProblemDetails } from "../errors/problem";
import { validationProblem } from "../errors/problem";
import type { CreateMealRequest, MealRecord } from "../schemas/meals";
import { validateItems } from "./createMeal";

export type UpdateMealResult =
  | { ok: true; meal: MealRecord }
  | { ok: false; problem: ProblemDetails };

/**
 * Replaces one meal's items (UI design v0.7: grams fixes / item
 * removal). Same item rules as saving; date/meal_type stay untouched.
 * Editing down to zero items is rejected — deleting the record is the
 * explicit path for that.
 */
export async function updateMeal(
  mealId: string,
  body: unknown,
  seed: Seed = loadSeed(),
  persist: (
    id: string,
    items: CreateMealRequest["items"],
  ) => Promise<MealRecord | null> = updateMealItems,
): Promise<UpdateMealResult> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, problem: validationProblem(["invalid_body"]) };
  }

  const { items } = body as Record<string, unknown>;
  const errors = validateItems(items, seed);
  if (errors.length > 0) {
    return { ok: false, problem: validationProblem(errors) };
  }

  const cleanItems = (items as CreateMealRequest["items"]).map((item) => ({
    food_id: item.food_id,
    intake_g: item.intake_g,
  }));
  const meal = await persist(mealId, cleanItems);
  if (meal === null) {
    return {
      ok: false,
      problem: {
        type: "about:blank",
        title: "指定された記録が見つかりません。",
        status: 404,
      },
    };
  }
  return { ok: true, meal };
}
