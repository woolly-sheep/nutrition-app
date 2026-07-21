import { describe, expect, it } from "vitest";
import { loadSeed } from "../../../src/seed/loadSeed";
import { loadStandardWeights } from "../../../src/reference/standardWeights";

const seed = loadSeed();
const weights = loadStandardWeights();
const foodIds = new Set(seed.foodMaster.map((food) => food.food_id));

describe("standard weight reference", () => {
  it("references only food_ids that exist in the frozen seed", () => {
    for (const record of weights) {
      expect(foodIds.has(record.food_id)).toBe(true);
    }
  });

  it("has a positive numeric weight and a source for every entry", () => {
    for (const record of weights) {
      expect(record.typical_weight_g).toBeGreaterThan(0);
      expect(Number.isFinite(record.typical_weight_g)).toBe(true);
      expect(record.source.length).toBeGreaterThan(0);
      expect(record.confidence.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate food_id + display_unit pair", () => {
    const keys = weights.map((r) => `${r.food_id}|${r.display_unit}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
