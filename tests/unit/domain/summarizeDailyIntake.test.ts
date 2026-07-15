import { describe, expect, it } from "vitest";
import { summarizeDailyIntake } from "../../../src/domain/analysis/summarizeDailyIntake";
import type { NutrientJudgment } from "../../../src/domain/reference/types";

function judgment(overrides: Partial<NutrientJudgment>): NutrientJudgment {
  return {
    nutrientCode: "vitamin_c_mg",
    nutrientName: "ビタミンC",
    referenceType: "recommended_dietary_allowance",
    judgmentPolicy: "compare",
    status: "below_reference",
    referenceValue: 100,
    unit: "mg",
    intakeAmount: 0,
    ...overrides,
  };
}

describe("summarizeDailyIntake", () => {
  it("computes percent and remaining for exact RDA/AI references", () => {
    const summary = summarizeDailyIntake([
      judgment({ intakeAmount: 45, referenceValue: 100 }),
    ]);
    expect(summary.comparable).toHaveLength(1);
    expect(summary.comparable[0].percentOfReference).toBe(45);
    expect(summary.comparable[0].remainingAmount).toBe(55);
  });

  it("splits achieved (>=100%) from insufficient, shortfall-first order", () => {
    const summary = summarizeDailyIntake([
      judgment({ nutrientCode: "a", intakeAmount: 120, referenceValue: 100 }),
      judgment({ nutrientCode: "b", intakeAmount: 30, referenceValue: 100 }),
      judgment({ nutrientCode: "c", intakeAmount: 70, referenceValue: 100 }),
    ]);
    expect(summary.achieved.map((i) => i.judgment.nutrientCode)).toEqual(["a"]);
    expect(summary.insufficient.map((i) => i.judgment.nutrientCode)).toEqual([
      "b",
      "c",
    ]);
  });

  it("counts items at or above 80%", () => {
    const summary = summarizeDailyIntake([
      judgment({ nutrientCode: "a", intakeAmount: 80, referenceValue: 100 }),
      judgment({ nutrientCode: "b", intakeAmount: 79.9, referenceValue: 100 }),
      judgment({ nutrientCode: "c", intakeAmount: 130, referenceValue: 100 }),
    ]);
    expect(summary.atLeast80Count).toBe(2);
  });

  it("keeps remaining at zero when intake exceeds the reference", () => {
    const summary = summarizeDailyIntake([
      judgment({ intakeAmount: 150, referenceValue: 100 }),
    ]);
    expect(summary.comparable[0].remainingAmount).toBe(0);
  });

  it("collects UL exceedances with threshold, over amount, and percent", () => {
    const summary = summarizeDailyIntake([
      judgment({
        nutrientCode: "vitamin_a_ug",
        referenceType: "tolerable_upper_intake_level",
        status: "above_upper_limit",
        referenceValue: 2700,
        intakeAmount: 3100,
        unit: "ug",
      }),
    ]);
    expect(summary.ulReached).toHaveLength(1);
    const item = summary.ulReached[0];
    expect(item.thresholdValue).toBe(2700);
    expect(item.overAmount).toBeCloseTo(400, 5);
    expect(item.percentOfThreshold).toBeCloseTo((3100 / 2700) * 100, 5);
  });

  it("collects DG overages using the less-than bound as the threshold", () => {
    const summary = summarizeDailyIntake([
      judgment({
        nutrientCode: "salt_equivalent_g",
        referenceType: "tentative_dietary_goal",
        status: "above_goal",
        referenceValue: "7.5未満",
        intakeAmount: 8.2,
        unit: "g",
      }),
    ]);
    expect(summary.dgOver).toHaveLength(1);
    expect(summary.dgOver[0].thresholdValue).toBe(7.5);
    expect(summary.dgOver[0].overAmount).toBeCloseTo(0.7, 5);
  });

  it("keeps below-threshold UL/DG judgments out of the exceedance lists", () => {
    const summary = summarizeDailyIntake([
      judgment({
        referenceType: "tolerable_upper_intake_level",
        status: "below_upper_limit",
        referenceValue: 2700,
        intakeAmount: 100,
      }),
      judgment({
        nutrientCode: "salt_equivalent_g",
        referenceType: "tentative_dietary_goal",
        status: "within_goal",
        referenceValue: "7.5未満",
        intakeAmount: 5,
      }),
    ]);
    expect(summary.ulReached).toHaveLength(0);
    expect(summary.dgOver).toHaveLength(0);
  });

  it("routes non-RDA/AI and non-numeric references to others, never guessing", () => {
    const summary = summarizeDailyIntake([
      judgment({
        nutrientCode: "salt_equivalent_g",
        referenceType: "tentative_dietary_goal",
        status: "within_goal",
        referenceValue: "6.5未満",
      }),
      judgment({
        nutrientCode: "iron_mg_ul",
        referenceType: "tolerable_upper_intake_level",
        status: "not_applicable",
        referenceValue: "not_established",
      }),
      judgment({
        nutrientCode: "iron_mg",
        referenceType: "recommended_dietary_allowance",
        status: "unknown",
        referenceValue: "6.0 no_menses / 10.0 menses",
      }),
    ]);
    expect(summary.comparable).toHaveLength(0);
    expect(summary.others).toHaveLength(3);
    expect(summary.withinGoalCount).toBe(1);
  });
});
