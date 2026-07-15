// Thin HTTP entrypoint. Implementation lives in src/server/api/handlers.
// Never log analysis results here (logging allowlist).

import { NextResponse } from "next/server";
import { getDailyAnalysis } from "../../../server/api/handlers/getDailyAnalysis";
import { getWeeklyAnalysis } from "../../../server/api/handlers/getWeeklyAnalysis";
import { validationProblem } from "../../../server/api/errors/problem";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const date = params.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const problem = validationProblem(["invalid_date"]);
    return NextResponse.json(problem, { status: problem.status });
  }

  const period = params.get("period") ?? "daily";
  if (period === "weekly") {
    return NextResponse.json(await getWeeklyAnalysis(date));
  }
  if (period !== "daily") {
    const problem = validationProblem(["invalid_period"]);
    return NextResponse.json(problem, { status: problem.status });
  }
  return NextResponse.json(await getDailyAnalysis(date));
}
