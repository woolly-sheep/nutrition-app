import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { appendMeal } from "../../store/mealStore";
import type { ProblemDetails } from "../errors/problem";
import { validationProblem } from "../errors/problem";
import {
  MAX_INTAKE_G,
  MAX_ITEMS_PER_MEAL,
  MEAL_TYPES,
  type CreateMealRequest,
  type MealRecord,
  type MealType,
} from "../schemas/meals";

export type CreateMealResult =
  | { ok: true; meal: MealRecord }
  | { ok: false; problem: ProblemDetails };

/**
 * Validates and saves one meal. Amounts are explicit grams only —
 * unit conversion never happens server-side (explicit grams first).
 * Validation errors return field codes only, never the submitted values.
 */
export async function createMeal(
  body: unknown,
  seed: Seed = loadSeed(),
  save: (input: CreateMealRequest) => Promise<MealRecord> = appendMeal,
): Promise<CreateMealResult> {
  const errors = validate(body, seed);
  if (errors.length > 0) {
    return { ok: false, problem: validationProblem(errors) };
  }

  const meal = await save(toCleanRequest(body as CreateMealRequest));
  return { ok: true, meal };
}

/** Persist only the schema fields — drop anything extra the client sent. */
function toCleanRequest(body: CreateMealRequest): CreateMealRequest {
  return {
    date: body.date,
    meal_type: body.meal_type,
    items: body.items.map((item) => ({
      food_id: item.food_id,
      intake_g: item.intake_g,
    })),
  };
}

function validate(body: unknown, seed: Seed): string[] {
  if (typeof body !== "object" || body === null) {
    return ["invalid_body"];
  }

  const errors: string[] = [];
  const { date, meal_type, items } = body as Record<string, unknown>;

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push("invalid_date");
  }
  if (!MEAL_TYPES.includes(meal_type as MealType)) {
    errors.push("invalid_meal_type");
  }
  errors.push(...validateItems(items, seed));
  return errors;
}

/** Shared by create (POST) and item edit (PUT) — same rules for items. */
export function validateItems(items: unknown, seed: Seed): string[] {
  if (!Array.isArray(items) || items.length === 0) {
    return ["empty_items"];
  }
  if (items.length > MAX_ITEMS_PER_MEAL) {
    return ["too_many_items"];
  }

  const errors: string[] = [];
  const knownFoodIds = new Set(seed.foodMaster.map((food) => food.food_id));
  for (const [index, item] of items.entries()) {
    errors.push(...validateItem(item, index, knownFoodIds));
  }
  return errors;
}

function validateItem(
  item: unknown,
  index: number,
  knownFoodIds: ReadonlySet<string>,
): string[] {
  if (typeof item !== "object" || item === null) {
    return [`items[${index}].invalid`];
  }

  const errors: string[] = [];
  const { food_id, intake_g } = item as Record<string, unknown>;

  if (typeof food_id !== "string" || !knownFoodIds.has(food_id)) {
    errors.push(`items[${index}].unknown_food`);
  }
  const isValidGrams =
    typeof intake_g === "number" &&
    Number.isFinite(intake_g) &&
    intake_g > 0 &&
    intake_g <= MAX_INTAKE_G;
  if (!isValidGrams) {
    errors.push(`items[${index}].invalid_intake_g`);
  }
  return errors;
}
