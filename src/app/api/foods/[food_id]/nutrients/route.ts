// Thin HTTP entrypoint. Never log the profile or nutrient values (allowlist).

import { NextResponse } from "next/server";
import { getFoodNutrients } from "../../../../../server/api/handlers/getFoodNutrients";
import { validationProblem } from "../../../../../server/api/errors/problem";

type RouteContext = { params: Promise<{ food_id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { food_id } = await params;
  const dateParam = new URL(request.url).searchParams.get("date");
  // Profile bands resolve as of this date; default to today for a plain lookup.
  const date = dateParam ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const problem = validationProblem(["invalid_date"]);
    return NextResponse.json(problem, { status: problem.status });
  }

  const result = await getFoodNutrients(food_id, date);
  if (result === null) {
    return NextResponse.json(
      {
        type: "about:blank",
        title: "指定された食材が見つかりません。",
        status: 404,
      },
      { status: 404 },
    );
  }
  return NextResponse.json(result);
}
