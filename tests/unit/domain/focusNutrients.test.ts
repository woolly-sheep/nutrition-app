import { describe, expect, it } from "vitest";
import { buildFocusNutrients } from "../../../src/domain/analysis/focusNutrients";
import type { NutrientJudgment } from "../../../src/domain/reference/types";

function dg(overrides: Partial<NutrientJudgment>): NutrientJudgment {
  return {
    nutrientCode: "dietary_fiber_g",
    nutrientName: "食物繊維",
    referenceType: "tentative_dietary_goal",
    judgmentPolicy: "compare",
    status: "below_goal",
    referenceValue: "22以上",
    unit: "g",
    intakeAmount: 0,
    ...overrides,
  };
}

describe("buildFocusNutrients", () => {
  it("keeps only 目標量(DG) judgments and drops RDA/AI/UL", () => {
    const focus = buildFocusNutrients([
      dg({ nutrientCode: "dietary_fiber_g", intakeAmount: 11, referenceValue: "22以上" }),
      dg({
        nutrientCode: "iron_mg",
        referenceType: "recommended_dietary_allowance",
        referenceValue: 7.5,
      }),
      dg({
        nutrientCode: "vitamin_a_ug",
        referenceType: "tolerable_upper_intake_level",
        referenceValue: 2700,
      }),
    ]);
    expect(focus.map((f) => f.nutrientCode)).toEqual(["dietary_fiber_g"]);
  });

  it("classifies an at-least goal as gain with fill toward the minimum", () => {
    const [fiber] = buildFocusNutrients([
      dg({ intakeAmount: 11, referenceValue: "22以上", status: "below_goal" }),
    ]);
    expect(fiber.direction).toBe("gain");
    expect(fiber.goalValue).toBe(22);
    expect(fiber.fillRatio).toBeCloseTo(0.5, 5);
    expect(fiber.remaining).toBeCloseTo(11, 5);
    expect(fiber.reached).toBe(false);
  });

  it("marks a met at-least goal (within_goal) as reached", () => {
    const [fiber] = buildFocusNutrients([
      dg({ intakeAmount: 25, referenceValue: "22以上", status: "within_goal" }),
    ]);
    expect(fiber.reached).toBe(true);
    expect(fiber.remaining).toBe(0);
  });

  it("classifies a %E range goal as balance with the energy share", () => {
    const [protein] = buildFocusNutrients([
      dg({
        nutrientCode: "protein_g",
        nutrientName: "たんぱく質",
        referenceValue: "13-20",
        status: "within_goal",
        energyRatioPercent: 16,
      }),
    ]);
    expect(protein.direction).toBe("balance");
    expect(protein.unit).toBe("%E");
    expect(protein.value).toBe(16);
    expect(protein.rangeMin).toBe(13);
    expect(protein.rangeMax).toBe(20);
    expect(protein.reached).toBe(true);
  });

  it("shows a %E balance row with no share when energy is unknown", () => {
    const [fat] = buildFocusNutrients([
      dg({
        nutrientCode: "fat_g",
        nutrientName: "脂質",
        referenceValue: "20-30",
        status: "unknown",
      }),
    ]);
    expect(fat.direction).toBe("balance");
    expect(fat.value).toBeNull();
    expect(fat.rangeMin).toBe(20);
  });

  it("classifies a less-than goal as limit with headroom under the maximum", () => {
    const [salt] = buildFocusNutrients([
      dg({
        nutrientCode: "salt_equivalent_g",
        nutrientName: "食塩相当量",
        referenceValue: "7.5未満",
        intakeAmount: 5.5,
        status: "within_goal",
      }),
    ]);
    expect(salt.direction).toBe("limit");
    expect(salt.goalValue).toBe(7.5);
    expect(salt.remaining).toBeCloseTo(2, 5);
    expect(salt.reached).toBe(true);
  });

  it("orders gain, then balance, then limit", () => {
    const focus = buildFocusNutrients([
      dg({ nutrientCode: "salt_equivalent_g", referenceValue: "7.5未満" }),
      dg({
        nutrientCode: "protein_g",
        referenceValue: "13-20",
        energyRatioPercent: 16,
      }),
      dg({ nutrientCode: "dietary_fiber_g", referenceValue: "22以上" }),
    ]);
    expect(focus.map((f) => f.direction)).toEqual(["gain", "balance", "limit"]);
  });
});
