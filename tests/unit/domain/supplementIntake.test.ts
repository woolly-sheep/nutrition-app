import { describe, expect, it } from "vitest";
import {
  combineIntake,
  sumSupplementIntake,
} from "../../../src/domain/nutrient/supplementIntake";
import {
  evaluateNonFoodLimits,
} from "../../../src/domain/analysis/nonFoodUpperLimits";
import type { SupplementRecord } from "../../../src/server/api/schemas/supplements";

function record(
  id: string,
  amounts: { nutrient_code: string; amount: number }[],
): SupplementRecord {
  return {
    supplement_id: id,
    date: "2026-07-24",
    product_name: "test",
    amounts,
    recorded_at: "2026-07-24T00:00:00.000Z",
  };
}

describe("sumSupplementIntake", () => {
  it("sums the same nutrient across records and ignores non-positive amounts", () => {
    const totals = sumSupplementIntake([
      record("a", [
        { nutrient_code: "iron_mg", amount: 5 },
        { nutrient_code: "zinc_mg", amount: 0 },
      ]),
      record("b", [{ nutrient_code: "iron_mg", amount: 3 }]),
    ]);
    expect(totals.get("iron_mg")).toBe(8);
    expect(totals.has("zinc_mg")).toBe(false);
  });
});

describe("combineIntake", () => {
  it("adds supplement amounts onto food amounts without mutating inputs", () => {
    const food = new Map([
      ["iron_mg", 4],
      ["calcium_mg", 200],
    ]);
    const supplement = new Map([["iron_mg", 6]]);
    const combined = combineIntake(food, supplement);
    expect(combined.get("iron_mg")).toBe(10);
    expect(combined.get("calcium_mg")).toBe(200);
    expect(food.get("iron_mg")).toBe(4);
  });
});

describe("evaluateNonFoodLimits", () => {
  it("compares supplement-only magnesium against the 350 non-food limit", () => {
    const statuses = evaluateNonFoodLimits(new Map([["magnesium_mg", 400]]));
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toMatchObject({
      nutrientCode: "magnesium_mg",
      limit: 350,
      exceeded: true,
    });
  });

  it("stays empty for nutrients with no non-food limit", () => {
    expect(evaluateNonFoodLimits(new Map([["iron_mg", 100]]))).toEqual([]);
  });

  it("does not flag magnesium at or below the limit", () => {
    const statuses = evaluateNonFoodLimits(new Map([["magnesium_mg", 350]]));
    expect(statuses[0].exceeded).toBe(false);
  });
});
