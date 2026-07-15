// Thin HTTP entrypoint. Implementation lives in src/server/api/handlers.

import { NextResponse } from "next/server";
import { getUsualFoods } from "../../../../server/api/handlers/getUsualFoods";
import { validationProblem } from "../../../../server/api/errors/problem";
import { MEAL_TYPES, type MealType } from "../../../../server/api/schemas/meals";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const mealType = params.get("meal_type") ?? "";
  const date = params.get("date") ?? "";

  const errors: string[] = [];
  if (!MEAL_TYPES.includes(mealType as MealType)) {
    errors.push("invalid_meal_type");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push("invalid_date");
  }
  if (errors.length > 0) {
    const problem = validationProblem(errors);
    return NextResponse.json(problem, { status: problem.status });
  }

  return NextResponse.json(await getUsualFoods(mealType, date));
}
