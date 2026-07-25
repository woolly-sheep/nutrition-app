// Thin HTTP entrypoint. Never log recipe contents here (logging allowlist).

import { NextResponse } from "next/server";
import { saveRecipe } from "../../../server/api/handlers/saveRecipe";
import { listRecipeViews } from "../../../server/api/handlers/listRecipes";

export async function GET() {
  return NextResponse.json({ recipes: await listRecipeViews() });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const result = await saveRecipe(body);

  if (!result.ok) {
    return NextResponse.json(result.problem, {
      status: result.problem.status,
    });
  }
  return NextResponse.json({ recipe: result.recipe }, { status: 201 });
}
