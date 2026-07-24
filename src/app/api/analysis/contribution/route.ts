// Thin HTTP entrypoint. Implementation lives in src/server/api/handlers.
// Never log contribution contents here (logging allowlist).

import { NextResponse } from "next/server";
import { getNutrientContribution } from "../../../../server/api/handlers/getNutrientContribution";
import { validationProblem } from "../../../../server/api/errors/problem";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const date = params.get("date") ?? "";
  const nutrient = params.get("nutrient") ?? "";
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push("invalid_date");
  }
  if (!/^[a-z0-9_]+$/.test(nutrient)) {
    errors.push("invalid_nutrient");
  }
  if (errors.length > 0) {
    const problem = validationProblem(errors);
    return NextResponse.json(problem, { status: problem.status });
  }
  return NextResponse.json(await getNutrientContribution(date, nutrient));
}
