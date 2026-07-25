import { describe, expect, it } from "vitest";
import { loadSeed } from "../../../src/seed/loadSeed";
import { topFoodsByNutrient } from "../../../src/domain/nutrient/topFoodsByNutrient";

const seed = loadSeed();

describe("topFoodsByNutrient", () => {
  it("returns foods sorted by amount descending, capped", () => {
    const foods = topFoodsByNutrient(seed, "vitamin_c_mg", 10);
    expect(foods.length).toBeGreaterThan(0);
    expect(foods.length).toBeLessThanOrEqual(10);
    for (let i = 1; i < foods.length; i += 1) {
      expect(foods[i - 1].amount_per_100g).toBeGreaterThanOrEqual(
        foods[i].amount_per_100g,
      );
    }
  });

  it("excludes non-positive / non-numeric amounts", () => {
    const foods = topFoodsByNutrient(seed, "iron_mg", 50);
    expect(foods.every((f) => f.amount_per_100g > 0)).toBe(true);
    expect(foods.every((f) => f.display_name.length > 0)).toBe(true);
  });

  it("returns empty for an unknown or non-selectable nutrient", () => {
    expect(topFoodsByNutrient(seed, "salt_equivalent_g", 10)).toEqual([]);
    expect(topFoodsByNutrient(seed, "nope", 10)).toEqual([]);
  });

  it("restricts to an allowed food set (history scope)", () => {
    const all = topFoodsByNutrient(seed, "vitamin_c_mg", 50);
    expect(all.length).toBeGreaterThan(1);
    const allowed = new Set([all[1].food_id]);
    const scoped = topFoodsByNutrient(seed, "vitamin_c_mg", 50, allowed);
    expect(scoped).toHaveLength(1);
    expect(scoped[0].food_id).toBe(all[1].food_id);
  });

  it("returns empty when the allowed set contains none of the nutrient's foods", () => {
    const scoped = topFoodsByNutrient(
      seed,
      "vitamin_c_mg",
      50,
      new Set(["food_that_does_not_exist"]),
    );
    expect(scoped).toEqual([]);
  });
});
