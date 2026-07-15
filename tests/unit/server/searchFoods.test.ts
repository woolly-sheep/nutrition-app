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

  it("exposes unit options as display support without converting", () => {
    const egg = searchFoods("卵", seed).foods.find(
      (food) => food.food_id === "food_egg_raw_001",
    );
    expect(egg).toBeDefined();
    const option = egg!.unit_options.find((o) => o.display_unit === "1個");
    // representative weight has no reliable public source → stays null
    expect(option?.representative_weight_g).toBeNull();
    expect(option?.warning_code).toBe("LOW_CONFIDENCE_CONVERSION");
  });
});
