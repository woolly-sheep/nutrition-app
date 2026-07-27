import { describe, expect, it } from "vitest";
import { buildBloomModel } from "../../../src/domain/analysis/nutrientGroups";
import type { AnalysisNutrientItem } from "../../../src/server/api/schemas/analysis";

function item(
  code: string,
  percent: number | undefined,
): AnalysisNutrientItem {
  return {
    nutrient_code: code,
    nutrient_name: code,
    unit: "mg",
    reference_type: "recommended_dietary_allowance",
    status: "below_reference",
    label: "",
    intake_amount: 0,
    food_amount: 0,
    supplement_amount: 0,
    reference_value: 100,
    percent_of_reference: percent,
  };
}

describe("buildBloomModel", () => {
  it("caps each member at 100% so over-supply cannot hide a deficit (#73)", () => {
    const model = buildBloomModel([
      item("vitamin_a_ug", 150),
      item("vitamin_d_ug", 50),
      item("iron_mg", 60),
      item("calcium_mg", 60),
    ]);
    const vitaminFat = model.petals.find((p) => p.key === "vitaminFat");
    // capped: (min(150,100) + 50) / 2 = 75% → the deficient D keeps it short
    expect(vitaminFat?.fulfillment).toBeCloseTo(0.75);
    expect(vitaminFat?.achieved).toBe(false);
    const mineralA = model.petals.find((p) => p.key === "mineralA");
    expect(mineralA?.fulfillment).toBeCloseTo(0.6);
    expect(mineralA?.achieved).toBe(false);
  });

  it("marks a group gold only when every member reaches its reference (#73)", () => {
    const model = buildBloomModel([
      item("vitamin_a_ug", 150),
      item("vitamin_d_ug", 120),
    ]);
    const vitaminFat = model.petals.find((p) => p.key === "vitaminFat");
    // capped: (100 + 100) / 2 = 100% → all members met → gold
    expect(vitaminFat?.fulfillment).toBeCloseTo(1);
    expect(vitaminFat?.achieved).toBe(true);
  });

  it("leaves a group with no comparable member as a bud (null)", () => {
    const model = buildBloomModel([item("protein_g", 80)]);
    const fiber = model.petals.find((p) => p.key === "fiber");
    expect(fiber?.fulfillment).toBeNull();
    expect(fiber?.achieved).toBe(false);
  });

  it("ignores items without a numeric percent", () => {
    const model = buildBloomModel([item("protein_g", undefined)]);
    const protein = model.petals.find((p) => p.key === "protein");
    expect(protein?.fulfillment).toBeNull();
    expect(model.overall).toBeNull();
  });

  it("computes overall as the mean of all comparable percents", () => {
    const model = buildBloomModel([
      item("protein_g", 100),
      item("iron_mg", 50),
    ]);
    expect(model.overall).toBeCloseTo(0.75);
  });

  it("caps over-supply in overall so it never exceeds 100% (#73)", () => {
    const model = buildBloomModel([
      item("vitamin_c_mg", 500),
      item("iron_mg", 50),
    ]);
    // uncapped mean would be 275%; capped: (100 + 50) / 2 = 75%
    expect(model.overall).toBeCloseTo(0.75);
  });

  it("flags a group over its upper limit and never marks it achieved", () => {
    const model = buildBloomModel(
      [item("iron_mg", 180), item("calcium_mg", 130)],
      new Set(["iron_mg"]),
    );
    const mineralA = model.petals.find((p) => p.key === "mineralA");
    expect(mineralA?.overLimit).toBe(true);
    // mean is >100% but an over-limit group is never gold
    expect(mineralA?.achieved).toBe(false);
  });
});
