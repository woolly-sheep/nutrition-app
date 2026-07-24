// Thin HTTP entrypoint. Implementation lives in src/server/api/handlers
// and src/server/store. Never log supplement contents here (logging allowlist).

import { NextResponse } from "next/server";
import { saveSupplement } from "../../../server/api/handlers/saveSupplement";
import { listSupplements } from "../../../server/store/supplementStore";

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date");
  return NextResponse.json({
    supplements: await listSupplements(date ?? undefined),
  });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const result = await saveSupplement(body);

  if (!result.ok) {
    return NextResponse.json(result.problem, {
      status: result.problem.status,
    });
  }
  return NextResponse.json({ supplement: result.supplement }, { status: 201 });
}
