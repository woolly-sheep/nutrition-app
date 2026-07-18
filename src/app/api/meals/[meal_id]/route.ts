// Thin HTTP entrypoint. Implementation lives in src/server/api/handlers
// and src/server/store. Never log meal contents here (logging allowlist).

import { NextResponse } from "next/server";
import { updateMeal } from "../../../../server/api/handlers/updateMeal";
import { deleteMeal } from "../../../../server/store/mealStore";

type RouteContext = { params: Promise<{ meal_id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const { meal_id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const result = await updateMeal(meal_id, body);

  if (!result.ok) {
    return NextResponse.json(result.problem, {
      status: result.problem.status,
    });
  }
  return NextResponse.json({ meal: result.meal });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { meal_id } = await params;
  const deleted = await deleteMeal(meal_id);
  if (!deleted) {
    return NextResponse.json(
      {
        type: "about:blank",
        title: "指定された記録が見つかりません。",
        status: 404,
      },
      { status: 404 },
    );
  }
  return NextResponse.json({ deleted: true });
}
