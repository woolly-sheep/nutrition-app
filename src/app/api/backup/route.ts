// Thin HTTP entrypoint. Implementation lives in src/server/api/handlers.

import { NextResponse } from "next/server";
import { getBackup, restoreBackup } from "../../../server/api/handlers/backup";

export async function GET() {
  return NextResponse.json(await getBackup());
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { type: "about:blank", title: "不正なJSONです。", status: 422 },
      { status: 422 },
    );
  }
  const result = await restoreBackup(body);
  if (!result.ok) {
    return NextResponse.json(result.problem, { status: result.problem.status });
  }
  return NextResponse.json({ restored: result.restored });
}
