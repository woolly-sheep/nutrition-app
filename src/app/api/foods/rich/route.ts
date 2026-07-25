// Thin HTTP entrypoint. Implementation lives in src/server/api/handlers.

import { NextResponse } from "next/server";
import {
  richFoods,
  type RichFoodsScope,
} from "../../../../server/api/handlers/richFoods";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const nutrient = params.get("nutrient") ?? "";
  const scope: RichFoodsScope =
    params.get("scope") === "history" ? "history" : "all";
  return NextResponse.json(await richFoods(nutrient, scope));
}
