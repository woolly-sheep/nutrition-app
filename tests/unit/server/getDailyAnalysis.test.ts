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
