// Thin HTTP entrypoint. Never log recipe contents here (logging allowlist).

import { NextResponse } from "next/server";
import { updateRecipe } from "../../../../server/api/handlers/updateRecipe";
import { deleteRecipe } from "../../../../server/store/recipeStore";

type RouteContext = { params: Promise<{ recipe_id: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  const { recipe_id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const result = await updateRecipe(recipe_id, body);

  if (!result.ok) {
    return NextResponse.json(result.problem, {
      status: result.problem.status,
    });
  }
  return NextResponse.json({ recipe: result.recipe });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { recipe_id } = await params;
  const deleted = await deleteRecipe(recipe_id);
  if (!deleted) {
    return NextResponse.json(
      {
        type: "about:blank",
        title: "指定された料理が見つかりません。",
        status: 404,
      },
      { status: 404 },
    );
  }
  return NextResponse.json({ deleted: true });
}
