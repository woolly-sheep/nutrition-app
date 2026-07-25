// Thin HTTP entrypoint. Never log recipe contents here (logging allowlist).

import { NextResponse } from "next/server";
import { deleteRecipe } from "../../../../server/store/recipeStore";

type RouteContext = { params: Promise<{ recipe_id: string }> };

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
