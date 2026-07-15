import { describe, expect, it } from "vitest";
import type { DailySummaryItem } from "../../../src/domain/analysis/summarizeDailyIntake";
import { summarizeWeeklyIntake } from "../../../src/domain/analysis/summarizeWeeklyIntake";
import type { NutrientJudgment } from "../../../src/domain/reference/types";

function item(nutrientCode: string, percent: number): DailySummaryItem {
  const judgment: NutrientJudgment = {
    nutrientCode,
    nutrientName: nutrientCode,
    referenceType: "recommended_dietary_allowance",
    judgmentPolicy: "compare",
    status: percent >= 100 ? "meets_reference" : "below_reference",
    referenceValue: 100,
    unit: "mg",
    intakeAmount: percent,
  };
  return {
    judgment,
    percentOfReference: percent,
    remainingAmount: Math.max(0, 100 - percent),
  };
}

describe("summarizeWeeklyIntake", () => {
  it("excludes missing days from averages instead of zero-filling (6c)", () => {
    const summary = summarizeWeeklyIntake([
      { date: "2026-07-06", items: [item("vitamin_c_mg", 80)] },
      { date: "2026-07-07", items: null },
      { date: "2026-07-08", items: [item("vitamin_c_mg", 120)] },
    ]);
    expect(summary.recordedDates).toEqual(["2026-07-06", "2026-07-08"]);
    expect(summary.missingDates).toEqual(["2026-07-07"]);
    const nutrient = summary.nutrients[0];
    expect(nutrient.averagePercent).toBe(100);
    expect(nutrient.recordedDays).toBe(2);
    expect(nutrient.daily).toEqual([
      { date: "2026-07-06", percent: 80 },
      { date: "2026-07-07", percent: null },
      { date: "2026-07-08", percent: 120 },
    ]);
  });

  it("counts below-50 and achieved days for redundant coding (5c)", () => {
    const summary = summarizeWeeklyIntake([
      { date: "d1", items: [item("iron_mg", 30)] },
      { date: "d2", items: [item("iron_mg", 49.9)] },
      { date: "d3", items: [item("iron_mg", 100)] },
    ]);
    const nutrient = summary.nutrients[0];
    expect(nutrient.daysBelow50).toBe(2);
    expect(nutrient.daysAchieved).toBe(1);
  });

  it("reports a pattern when at least half of recorded days are below 50%", () => {
    const summary = summarizeWeeklyIntake([
      { date: "d1", items: [item("vitamin_d_ug", 40), item("vitamin_c_mg", 90)] },
      { date: "d2", items: [item("vitamin_d_ug", 45), item("vitamin_c_mg", 95)] },
      { date: "d3", items: [item("vitamin_d_ug", 80), item("vitamin_c_mg", 88)] },
    ]);
    expect(summary.patterns.map((p) => p.nutrientCode)).toEqual([
      "vitamin_d_ug",
    ]);
    expect(summary.patterns[0].daysBelow50).toBe(2);
  });

  it("treats a nutrient absent from a recorded day as 0%, not as missing", () => {
    const summary = summarizeWeeklyIntake([
      { date: "d1", items: [item("vitamin_c_mg", 100)] },
      { date: "d2", items: [item("iron_mg", 60)] },
    ]);
    const vitaminC = summary.nutrients.find(
      (nutrient) => nutrient.nutrientCode === "vitamin_c_mg",
    );
    expect(vitaminC!.averagePercent).toBe(50);
    expect(vitaminC!.daily[1].percent).toBe(0);
  });

  it("returns empty structures for a week with no records at all", () => {
    const summary = summarizeWeeklyIntake([
      { date: "d1", items: null },
      { date: "d2", items: null },
    ]);
    expect(summary.recordedDates).toHaveLength(0);
    expect(summary.nutrients).toHaveLength(0);
    expect(summary.patterns).toHaveLength(0);
  });
});
