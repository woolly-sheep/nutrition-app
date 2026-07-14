// Thin HTTP entrypoint.
// Put implementation in src/server/api/handlers.

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ route: "foods", status: "not_implemented" });
}
