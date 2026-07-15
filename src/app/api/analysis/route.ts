// Thin HTTP entrypoint. Implementation lives in src/server/api/handlers.
// Never log analysis results here (logging allowlist).

import { NextResponse } from "next/server";
import { getDailyAnalysis } from "../../../server/api/handlers/getDailyAnalysis";
import { validationProblem } from "../../../server/api/errors/problem";

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const problem = validationProblem(["invalid_date"]);
    return NextResponse.json(problem, { status: problem.status });
  }
  return NextResponse.json(await getDailyAnalysis(date));
}
