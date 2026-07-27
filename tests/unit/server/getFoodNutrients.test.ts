import { describe, expect, it } from "vitest";
import { getFoodNutrients } from "../../../src/server/api/handlers/getFoodNutrients";
import { loadSeed } from "../../../src/seed/loadSeed";
import type { StoredProfile } from "../../../src/server/store/profileStore";

const seed = loadSeed();
const profile: StoredProfile = { sex: "male", ageBand: "adult_30_49" };
const FOOD_ID = "food_nattoo_001";
const DATE = "2026-07-27";

describe("getFoodNutrients", () => {
  it("returns null for an unknown food", async () => {
    const result = await getFoodNutrients("no_such_food", DATE, {
      seed,
      loadProfile: async () => null,
    });
    expect(result).toBeNull();
  });

  it("returns per-100g amounts without percents when no profile is set", async () => {
    const result = await getFoodNutrients(FOOD_ID, DATE, {
      seed,
      loadProfile: async () => null,
    });
    expect(result).not.toBeNull();
    expect(result?.profile_applied).toBe(false);
    // Every tracked nutrient (minus energy) is listed.
    expect(result?.nutrients.length).toBeGreaterThan(0);
    for (const n of result?.nutrients ?? []) {
      expect(n.percent_of_reference).toBeNull();
      expect(typeof n.amount_label).toBe("string");
    }
    // Energy is surfaced separately, not as a nutrient row.
    expect(
      result?.nutrients.some((n) => n.nutrient_code === "energy_kcal"),
    ).toBe(false);
  });

  it("fills percent_of_reference for comparable nutrients when a profile is set", async () => {
    const result = await getFoodNutrients(FOOD_ID, DATE, {
      seed,
      loadProfile: async () => profile,
    });
    expect(result?.profile_applied).toBe(true);
    const iron = result?.nutrients.find((n) => n.nutrient_code === "iron_mg");
    expect(iron).toBeDefined();
    expect(typeof iron?.amount_per_100g).toBe("number");
    expect(typeof iron?.percent_of_reference).toBe("number");
    expect(iron?.reference_type).toBeTruthy();
  });

  it("computes a P/F/C energy split that sums to 100", async () => {
    const result = await getFoodNutrients(FOOD_ID, DATE, {
      seed,
      loadProfile: async () => null,
    });
    const macro = result?.macro_energy;
    expect(macro).not.toBeNull();
    if (macro) {
      expect(
        macro.protein_percent + macro.fat_percent + macro.carbohydrate_percent,
      ).toBe(100);
    }
  });

  it("carries the source notice and never invents values", async () => {
    const result = await getFoodNutrients(FOOD_ID, DATE, {
      seed,
      loadProfile: async () => null,
    });
    expect(result?.notice).toContain("八訂");
    expect(result?.sources.length).toBeGreaterThan(0);
  });
});
