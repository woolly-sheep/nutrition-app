// Thin HTTP entrypoint. Implementation lives in src/server/api/handlers.
// Never log trend contents here (logging allowlist).

import { NextResponse } from "next/server";
import {
  DEFAULT_TREND_DAYS,
  getNutrientTrend,
} from "../../../../server/api/handlers/getNutrientTrend";
import { validationProblem } from "../../../../server/api/errors/problem";

const MAX_TREND_DAYS = 90;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const date = params.get("date") ?? "";
  const nutrient = params.get("nutrient") ?? "";
  const daysRaw = params.get("days");
  const errors: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    errors.push("invalid_date");
  }
  if (!/^[a-z0-9_]+$/.test(nutrient)) {
    errors.push("invalid_nutrient");
  }
  let days = DEFAULT_TREND_DAYS;
  if (daysRaw !== null) {
    const parsed = Number(daysRaw);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_TREND_DAYS) {
      errors.push("invalid_days");
    } else {
      days = parsed;
    }
  }
  if (errors.length > 0) {
    const problem = validationProblem(errors);
    return NextResponse.json(problem, { status: problem.status });
  }
  return NextResponse.json(await getNutrientTrend(date, nutrient, days));
}
