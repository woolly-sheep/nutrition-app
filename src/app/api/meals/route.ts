// Thin HTTP entrypoint. Implementation lives in src/server/api/handlers.
// Never log request/response bodies here (logging allowlist).

import { NextResponse } from "next/server";
import { createMeal } from "../../../server/api/handlers/createMeal";
import { listMeals } from "../../../server/store/mealStore";

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? undefined;
  const meals = await listMeals(date);
  return NextResponse.json({ meals });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const result = await createMeal(body);

  if (!result.ok) {
    return NextResponse.json(result.problem, {
      status: result.problem.status,
    });
  }
  return NextResponse.json({ meal: result.meal }, { status: 201 });
}
