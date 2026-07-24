// Thin HTTP entrypoint. Implementation lives in src/server/api/handlers.

import { NextResponse } from "next/server";
import { richFoods } from "../../../../server/api/handlers/richFoods";

export async function GET(request: Request) {
  const nutrient = new URL(request.url).searchParams.get("nutrient") ?? "";
  return NextResponse.json(richFoods(nutrient));
}
