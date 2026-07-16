import { describe, expect, it } from "vitest";
import { getDailyAnalysis } from "../../../src/server/api/handlers/getDailyAnalysis";
import type { MealRecord } from "../../../src/server/api/schemas/meals";
import type { StoredProfile } from "../../../src/server/store/profileStore";
import { loadSeed } from "../../../src/seed/loadSeed";

const seed = loadSeed();
const profile: StoredProfile = { sex: "male", ageBand: "adult_30_49" };

function meal(items: MealRecord["items"]): MealRecord {
  return {
    meal_id: "meal_test",
    date: "2026-07-15",
    meal_type: "lunch",
    items,
    recorded_at: "2026-07-15T00:00:00.000Z",
  };
}

describe("getDailyAnalysis", () => {
  it("requires a profile before summarizing", async () => {
    const result = await getDailyAnalysis("2026-07-15", {
      seed,
      loadProfile: async () => null,
      loadMeals: async () => [meal([{ food_id: "food_rice_cooked_white_001", intake_g: 150 }])],
    });
    expect(result.profile_required).toBe(true);
    expect(result.summary).toBeNull();
  });

  it("reports empty days as has_records=false, not as zero-filled analysis", async () => {
    const result = await getDailyAnalysis("2026-07-15", {
      seed,
      loadProfile: async () => profile,
      loadMeals: async () => [],
    });
    expect(result.profile_required).toBe(false);
    expect(result.has_records).toBe(false);
    expect(result.summary).toBeNull();
  });

  it("summarizes a recorded day with safe-wording labels and disclaimer", async () => {
    const result = await getDailyAnalysis("2026-07-15", {
      seed,
      loadProfile: async () => profile,
      loadMeals: async () => [
        meal([{ food_id: "food_rice_cooked_white_001", intake_g: 150 }]),
      ],
    });
    expect(result.has_records).toBe(true);
    expect(result.summary).not.toBeNull();
    const items = [
      ...result.summary!.achieved,
      ...result.summary!.insufficient,
    ];
    expect(items.length).toBeGreaterThan(0);
    expect(result.summary!.comparable_count).toBe(items.length);
    for (const item of items) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.label).not.toMatch(/不足です|欠乏症/);
    }
    expect(result.disclaimer).toContain("推定値");
    expect(result.sources.length).toBe(2);
  });

  it("returns warning codes without meal contents", async () => {
    const result = await getDailyAnalysis("2026-07-15", {
      seed,
      loadProfile: async () => profile,
      loadMeals: async () => [
        meal([{ food_id: "food_unknown_999", intake_g: 100 }]),
      ],
    });
    expect(result.warning_codes).toContain("unknown_food");
    expect(JSON.stringify(result.warning_codes)).not.toContain("100");
  });

  it("reports UL exceedance with per-meal breakdown for an extreme intake", async () => {
    const result = await getDailyAnalysis("2026-07-15", {
      seed,
      loadProfile: async () => profile,
      loadMeals: async () => [
        { ...meal([{ food_id: "food_egg_raw_001", intake_g: 1500 }]), meal_type: "breakfast" },
        { ...meal([{ food_id: "food_egg_raw_001", intake_g: 1500 }]), meal_type: "dinner" },
      ],
    });
    const ul = result.summary!.ul_reached.find(
      (item) => item.nutrient_code === "vitamin_a_ug",
    );
    expect(ul).toBeDefined();
    expect(ul!.intake_amount).toBeGreaterThan(ul!.threshold_value);
    expect(ul!.over_amount).toBeCloseTo(
      ul!.intake_amount - ul!.threshold_value,
      5,
    );
    expect(ul!.note).toContain("専門家");
    expect(ul!.meal_breakdown.length).toBe(2);
    expect(ul!.meal_breakdown[0].amount).toBeGreaterThanOrEqual(
      ul!.meal_breakdown[1].amount,
    );
  });

  it("reports DG salt overage with the DG/UL distinction note", async () => {
    const result = await getDailyAnalysis("2026-07-15", {
      seed,
      loadProfile: async () => profile,
      loadMeals: async () => [
        meal([{ food_id: "food_miso_001", intake_g: 100 }]),
      ],
    });
    const salt = result.summary!.dg_over.find(
      (item) => item.nutrient_code === "salt_equivalent_g",
    );
    expect(salt).toBeDefined();
    expect(salt!.threshold_value).toBe(7.5);
    expect(salt!.over_amount).toBeCloseTo(12.4 - 7.5, 5);
    expect(salt!.note).toContain("目標量(DG)");
  });

  it("reports %E-range DG overage in %E units with the range and no breakdown", async () => {
    // ごま 100g: fat 54.2g × 9 ÷ 605 kcal = 80.6%E → above the 20–30 range
    const result = await getDailyAnalysis("2026-07-17", {
      seed,
      loadProfile: async () => profile,
      loadMeals: async () => [
        meal([{ food_id: "food_sesame_001", intake_g: 100 }]),
      ],
    });
    const fat = result.summary!.dg_over.find(
      (item) => item.nutrient_code === "fat_g",
    );
    expect(fat).toBeDefined();
    expect(fat!.unit).toBe("%E");
    expect(fat!.intake_amount).toBeCloseTo((54.2 * 9 * 100) / 605, 1);
    expect(fat!.range_min).toBe(20);
    expect(fat!.threshold_value).toBe(30);
    expect(fat!.over_amount).toBeCloseTo(fat!.intake_amount - 30, 5);
    expect(fat!.meal_breakdown).toHaveLength(0);
    expect(fat!.reference_value).toBe("20-30");
  });

  it("keeps UL empty on a normal day; rice-only day correctly flags carb %E", async () => {
    const result = await getDailyAnalysis("2026-07-15", {
      seed,
      loadProfile: async () => profile,
      loadMeals: async () => [
        meal([{ food_id: "food_rice_cooked_white_001", intake_g: 150 }]),
      ],
    });
    expect(result.summary!.ul_reached).toHaveLength(0);
    // rice only → carbohydrate energy share above the 50–65%E goal range,
    // which is a true fact (decision-20260717); no gram-based DG overage
    expect(
      result.summary!.dg_over.every((item) => item.unit === "%E"),
    ).toBe(true);
    expect(
      result.summary!.dg_over.map((item) => item.nutrient_code),
    ).toContain("carbohydrate_g");
  });

  it("keeps rice shortfalls consistent with domain math (iron RDA example)", async () => {
    const result = await getDailyAnalysis("2026-07-15", {
      seed,
      loadProfile: async () => profile,
      loadMeals: async () => [
        meal([{ food_id: "food_rice_cooked_white_001", intake_g: 150 }]),
      ],
    });
    const iron = result.summary!.insufficient.find(
      (item) => item.nutrient_code === "iron_mg",
    );
    expect(iron).toBeDefined();
    expect(iron!.intake_amount).toBeCloseTo(0.15, 5);
    if (typeof iron!.reference_value === "number") {
      expect(iron!.remaining_amount).toBeCloseTo(
        iron!.reference_value - 0.15,
        5,
      );
    }
  });
});
