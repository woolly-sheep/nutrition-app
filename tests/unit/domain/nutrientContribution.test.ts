import { describe, expect, it } from "vitest";
import { nutrientContribution } from "../../../src/domain/analysis/nutrientContribution";
import type { NutrientAmountRecord } from "../../../src/seed/types";

function amountRecord(
  overrides: Partial<NutrientAmountRecord>,
): NutrientAmountRecord {
  return {
    food_id: "food_a",
    display_name: "食品A",
    official_food_code: "00000",
    official_food_name: "食品A",
    nutrient_code: "iron_mg",
    nutrient_name: "鉄",
    amount_per_100g: 10,
    unit: "mg",
    value_status: "official_value",
    source_table: "test",
    source_snapshot_version: "test",
    correction_baseline: "test",
    source_checked_at: "2026-07-24",
    review_status: "approved",
    reviewer_note: null,
    ...overrides,
  };
}

const amounts: NutrientAmountRecord[] = [
  amountRecord({ food_id: "natto", amount_per_100g: 3.3 }),
  amountRecord({ food_id: "spinach", amount_per_100g: 2.0 }),
  amountRecord({ food_id: "rice", amount_per_100g: 0.6 }),
  amountRecord({ food_id: "misc", amount_per_100g: 0.5 }),
];

describe("nutrientContribution", () => {
  it("ranks foods by contributed amount, largest first", () => {
    const result = nutrientContribution(
      [
        { foodId: "natto", intakeG: 100 }, // 3.3
        { foodId: "spinach", intakeG: 100 }, // 2.0
        { foodId: "rice", intakeG: 100 }, // 0.6
      ],
      "iron_mg",
      amounts,
    );
    expect(result.top.map((t) => t.foodId)).toEqual(["natto", "spinach", "rice"]);
    expect(result.totalAmount).toBeCloseTo(5.9, 5);
    expect(result.top[0].percent).toBeCloseTo((3.3 / 5.9) * 100, 4);
    expect(result.otherAmount).toBe(0);
  });

  it("aggregates the tail beyond maxItems into 'other'", () => {
    const result = nutrientContribution(
      [
        { foodId: "natto", intakeG: 100 }, // 3.3
        { foodId: "spinach", intakeG: 100 }, // 2.0
        { foodId: "rice", intakeG: 100 }, // 0.6
        { foodId: "misc", intakeG: 100 }, // 0.5
      ],
      "iron_mg",
      amounts,
      2,
    );
    expect(result.top).toHaveLength(2);
    expect(result.otherAmount).toBeCloseTo(1.1, 5); // rice + misc
    expect(result.otherPercent).toBeCloseTo((1.1 / 6.4) * 100, 4);
  });

  it("sums the same food across meals", () => {
    const result = nutrientContribution(
      [
        { foodId: "natto", intakeG: 50 }, // 1.65
        { foodId: "natto", intakeG: 50 }, // 1.65
      ],
      "iron_mg",
      amounts,
    );
    expect(result.top).toHaveLength(1);
    expect(result.top[0].amount).toBeCloseTo(3.3, 5);
    expect(result.top[0].percent).toBe(100);
  });

  it("skips foods without a numeric official value and invalid grams", () => {
    const withTrace: NutrientAmountRecord[] = [
      ...amounts,
      amountRecord({ food_id: "trace", amount_per_100g: "Tr" }),
    ];
    const result = nutrientContribution(
      [
        { foodId: "natto", intakeG: 100 },
        { foodId: "trace", intakeG: 100 }, // non-numeric → skipped
        { foodId: "spinach", intakeG: 0 }, // invalid grams → skipped
      ],
      "iron_mg",
      withTrace,
    );
    expect(result.top.map((t) => t.foodId)).toEqual(["natto"]);
  });

  it("returns an empty contribution when nothing matches", () => {
    const result = nutrientContribution(
      [{ foodId: "unknown", intakeG: 100 }],
      "iron_mg",
      amounts,
    );
    expect(result.top).toEqual([]);
    expect(result.totalAmount).toBe(0);
    expect(result.otherPercent).toBe(0);
  });
});
