// Thin HTTP entrypoint. Implementation lives in src/server/api/handlers.

import { NextResponse } from "next/server";
import { saveProfile } from "../../../server/api/handlers/saveProfile";
import { readProfile } from "../../../server/store/profileStore";

export async function GET() {
  const profile = await readProfile();
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const result = await saveProfile(body);

  if (!result.ok) {
    return NextResponse.json(result.problem, {
      status: result.problem.status,
    });
  }
  return NextResponse.json({ profile: result.profile });
}
