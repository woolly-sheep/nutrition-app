import { describe, expect, it } from "vitest";
import { buildWeekGarden } from "../../../src/domain/analysis/weekGarden";
import type { WeeklyAnalysisResponse } from "../../../src/server/api/schemas/analysis";

function weekly(
  overrides: Partial<WeeklyAnalysisResponse> = {},
): WeeklyAnalysisResponse {
  return {
    date: "2026-07-22",
    week_start: "2026-07-20",
    week_end: "2026-07-26",
    profile: null,
    profile_required: false,
    recorded_dates: [],
    missing_dates: [],
    nutrients: [],
    patterns: [],
    disclaimer: "",
    sources: [],
    ...overrides,
  };
}

describe("buildWeekGarden", () => {
  it("returns 7 days from week_start with weekday labels", () => {
    const days = buildWeekGarden(weekly(), "2026-07-22");
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe("2026-07-20");
    expect(days[6].date).toBe("2026-07-26");
  });

  it("averages recorded nutrient percents into a day's fulfilment", () => {
    const days = buildWeekGarden(
      weekly({
        nutrients: [
          {
            nutrient_code: "iron_mg",
            nutrient_name: "鉄",
            unit: "mg",
            average_percent: 0,
            days_below_50: 0,
            days_achieved: 0,
            recorded_days: 1,
            daily: [{ date: "2026-07-20", percent: 80 }],
          },
          {
            nutrient_code: "protein_g",
            nutrient_name: "たんぱく質",
            unit: "g",
            average_percent: 0,
            days_below_50: 0,
            days_achieved: 0,
            recorded_days: 1,
            daily: [{ date: "2026-07-20", percent: 120 }],
          },
        ],
      }),
      "2026-07-22",
    );
    // (80 + 120) / 2 = 100% → 1.0
    expect(days[0].fulfillment).toBeCloseTo(1);
  });

  it("marks today and future, and leaves un-recorded days as buds (null)", () => {
    const days = buildWeekGarden(weekly(), "2026-07-22");
    const today = days.find((d) => d.date === "2026-07-22");
    expect(today?.isToday).toBe(true);
    expect(days.find((d) => d.date === "2026-07-26")?.isFuture).toBe(true);
    expect(today?.fulfillment).toBeNull();
  });
});
