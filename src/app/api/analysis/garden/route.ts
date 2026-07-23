// Thin HTTP entrypoint. Implementation lives in src/server/api/handlers.

import { NextResponse } from "next/server";
import { getGarden } from "../../../../server/api/handlers/getGarden";

export async function GET(request: Request) {
  const date =
    new URL(request.url).searchParams.get("date") ??
    new Date().toISOString().slice(0, 10);
  return NextResponse.json(await getGarden(date));
}
