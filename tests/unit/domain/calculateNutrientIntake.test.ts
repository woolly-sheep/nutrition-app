import { describe, expect, it } from "vitest";
import { calculateNutrientIntake } from "../../../src/domain/nutrient/calculateNutrientIntake";
import { loadSeed } from "../../../src/seed/loadSeed";
import type { NutrientAmountRecord } from "../../../src/seed/types";

function amountRecord(
  overrides: Partial<NutrientAmountRecord>,
): NutrientAmountRecord {
  return {
    food_id: "food_test",
    display_name: "テスト食品",
    official_food_code: "00000",
    official_food_name: "テスト食品",
    nutrient_code: "protein_g",
    nutrient_name: "たんぱく質",
    amount_per_100g: 10,
    unit: "g",
    value_status: "official_value",
    source_table: "test",
    source_snapshot_version: "test",
    correction_baseline: "test",
    source_checked_at: "2026-07-14",
    review_status: "approved",
    reviewer_note: null,
    ...overrides,
  };
}

describe("calculateNutrientIntake", () => {
  it("estimates intake as intake_g × amount_per_100g / 100", () => {
    const result = calculateNutrientIntake(
      [{ foodId: "food_test", intakeG: 150 }],
      [amountRecord({ amount_per_100g: 20.5 })],
    );

    expect(result.warnings).toEqual([]);
    expect(result.totals).toEqual([
      {
        nutrientCode: "protein_g",
        nutrientName: "たんぱく質",
        unit: "g",
        totalAmount: 30.75,
      },
    ]);
  });

  it("sums the same nutrient across multiple items", () => {
    const records = [
      amountRecord({ food_id: "food_a", amount_per_100g: 10 }),
      amountRecord({ food_id: "food_b", amount_per_100g: 4 }),
    ];
    const result = calculateNutrientIntake(
      [
        { foodId: "food_a", intakeG: 100 },
        { foodId: "food_b", intakeG: 50 },
      ],
      records,
    );

    expect(result.totals).toHaveLength(1);
    expect(result.totals[0].totalAmount).toBe(12);
  });

  it("returns a warning for non-positive or non-finite intake_g", () => {
    const records = [amountRecord({})];
    for (const intakeG of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = calculateNutrientIntake(
        [{ foodId: "food_test", intakeG }],
        records,
      );
      expect(result.totals).toEqual([]);
      expect(result.warnings).toEqual([
        { code: "invalid_intake_g", foodId: "food_test" },
      ]);
    }
  });

  it("returns a warning for a food that has no nutrient records", () => {
    const result = calculateNutrientIntake(
      [{ foodId: "food_missing", intakeG: 100 }],
      [amountRecord({})],
    );
    expect(result.warnings).toEqual([
      { code: "unknown_food", foodId: "food_missing" },
    ]);
  });

  it("reports a non-numeric official value as a warning without guessing", () => {
    const result = calculateNutrientIntake(
      [{ foodId: "food_test", intakeG: 100 }],
      [amountRecord({ amount_per_100g: "Tr" })],
    );
    expect(result.totals).toEqual([]);
    expect(result.warnings).toEqual([
      {
        code: "non_numeric_official_value",
        foodId: "food_test",
        nutrientCode: "protein_g",
        officialValue: "Tr",
      },
    ]);
  });

  it("computes against the frozen seed without warnings", () => {
    const seed = loadSeed();
    const foodId = seed.foodMaster[0].food_id;
    const result = calculateNutrientIntake(
      [{ foodId, intakeG: 80 }],
      seed.nutrientAmount,
    );

    expect(result.warnings).toEqual([]);
    const expected = seed.nutrientAmount
      .filter(
        (r) => r.food_id === foodId && typeof r.amount_per_100g === "number",
      )
      .map((r) => ({
        nutrientCode: r.nutrient_code,
        amount: (80 * (r.amount_per_100g as number)) / 100,
      }));
    for (const { nutrientCode, amount } of expected) {
      const total = result.totals.find((t) => t.nutrientCode === nutrientCode);
      expect(total?.totalAmount).toBe(amount);
    }
  });
});
