// Thin HTTP entrypoint. Implementation lives in src/server/api/handlers.

import { NextResponse } from "next/server";
import { resolveProfileForDate } from "../../../server/api/profileResolution";
import { saveProfile } from "../../../server/api/handlers/saveProfile";
import { readProfile } from "../../../server/store/profileStore";

export async function GET() {
  const stored = await readProfile();
  if (stored === null) {
    return NextResponse.json({ profile: null });
  }
  // Band for today, for display only — comparisons resolve their own.
  const today = new Date().toISOString().slice(0, 10);
  const resolved = resolveProfileForDate(stored, today);
  return NextResponse.json({
    profile: resolved.ok
      ? { ...stored, ageBand: resolved.profile.ageBand }
      : stored,
  });
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
