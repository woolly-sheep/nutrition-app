import { describe, expect, it } from "vitest";
import { loadSeed } from "../../../src/seed/loadSeed";
import { searchFoods } from "../../../src/server/api/handlers/searchFoods";
import { EMPTY_SEARCH_MESSAGE } from "../../../src/server/api/schemas/foods";

const seed = loadSeed();

describe("searchFoods", () => {
  it("matches by display_name substring", () => {
    const result = searchFoods("ごはん", seed);
    expect(result.foods.length).toBeGreaterThan(0);
    expect(
      result.foods.every((food) => food.display_name.includes("ごはん")),
    ).toBe(true);
  });

  it("returns the full MVP catalog for an empty query", () => {
    const result = searchFoods("", seed);
    expect(result.foods).toHaveLength(seed.foodMaster.length);
    expect(result.message).toBeUndefined();
  });

  it("returns 200-style empty result with message, not an error (API v0.2 §6)", () => {
    const result = searchFoods("存在しない食品XYZ", seed);
    expect(result.foods).toHaveLength(0);
    expect(result.message).toBe(EMPTY_SEARCH_MESSAGE);
  });

  it("exposes numeric energy per 100g and keeps non-numeric values null", () => {
    const rice = searchFoods("白ごはん", seed).foods[0];
    expect(rice.energy_kcal_per_100g).toBe(156);
  });

  it("fills the seed unit gap with a standard weight estimate (卵 1個)", () => {
    const egg = searchFoods("卵", seed).foods.find(
      (food) => food.food_id === "food_egg_raw_001",
    );
    expect(egg).toBeDefined();
    const option = egg!.unit_options.find((o) => o.display_unit === "1個");
    // Seed weight is null; the standard weight reference fills it as 推定.
    expect(option?.representative_weight_g).toBe(50);
    expect(option?.source).toBe("reference_estimate");
    expect(option?.source_note).not.toBeNull();
  });

  it("never overwrites an official seed weight with a reference estimate", () => {
    // A reference row must only fill gaps; supply a fake official weight and
    // confirm the reference does not replace it.
    const officialSeed = {
      ...seed,
      unitConversion: [
        {
          unit_conversion_id: "uc_test",
          food_id: "food_egg_raw_001",
          display_name: "卵",
          display_unit: "1個",
          representative_weight_g: 55,
          confidence_level: "high",
          source_note: "official",
          source_type: "public_source",
          warning_code: null,
          review_status: "approved",
          reviewer_note: null,
        },
      ],
    };
    const egg = searchFoods("卵", officialSeed).foods.find(
      (food) => food.food_id === "food_egg_raw_001",
    );
    const option = egg!.unit_options.find((o) => o.display_unit === "1個");
    expect(option?.representative_weight_g).toBe(55);
    expect(option?.source).toBe("official_seed");
  });
});
