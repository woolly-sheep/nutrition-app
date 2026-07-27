import { describe, expect, it } from "vitest";
import {
  getNutrientTrends,
} from "../../../src/server/api/handlers/getNutrientTrends";
import { TREND_NOTICE } from "../../../src/server/api/handlers/getNutrientTrend";
import type { MealRecord } from "../../../src/server/api/schemas/meals";
import type { StoredProfile } from "../../../src/server/store/profileStore";
import { loadSeed } from "../../../src/seed/loadSeed";

const seed = loadSeed();
const profile: StoredProfile = { sex: "male", ageBand: "adult_30_49" };

function meal(date: string, items: MealRecord["items"]): MealRecord {
  return {
    meal_id: `meal_${date}`,
    date,
    meal_type: "lunch",
    items,
    recorded_at: `${date}T00:00:00.000Z`,
  };
}

describe("getNutrientTrends", () => {
  it("requires a profile before building any series", async () => {
    const result = await getNutrientTrends("2026-07-24", 7, {
      seed,
      loadProfile: async () => null,
      loadMeals: async () => [],
      loadSupplements: async () => [],
    });
    expect(result.profile_required).toBe(true);
    expect(result.nutrients).toEqual([]);
  });

  it("builds oldest→newest points for every comparable nutrient in one pass", async () => {
    const recorded = "2026-07-24";
    let mealCalls = 0;
    const result = await getNutrientTrends(recorded, 7, {
      seed,
      loadProfile: async () => profile,
      loadMeals: async (date) => {
        mealCalls += 1;
        return date === recorded
          ? [meal(date, [{ food_id: "food_nattoo_001", intake_g: 100 }])]
          : [];
      },
      loadSupplements: async () => [],
    });
    // Single window pass: meals are loaded once per day, not once per nutrient.
    expect(mealCalls).toBe(7);
    expect(result.nutrients.length).toBeGreaterThan(0);
    for (const series of result.nutrients) {
      expect(series.points).toHaveLength(7);
      expect(series.points[0].date).toBe("2026-07-18");
      expect(series.points[6].date).toBe(recorded);
    }
    expect(result.notice).toBe(TREND_NOTICE);
  });

  it("marks days without records as null, never zero-filled", async () => {
    const recorded = "2026-07-24";
    const result = await getNutrientTrends(recorded, 3, {
      seed,
      loadProfile: async () => profile,
      loadMeals: async (date) =>
        date === recorded
          ? [meal(date, [{ food_id: "food_nattoo_001", intake_g: 100 }])]
          : [],
      loadSupplements: async () => [],
    });
    const iron = result.nutrients.find((n) => n.nutrient_code === "iron_mg");
    expect(iron).toBeDefined();
    expect(iron?.points[0].percent).toBeNull();
    expect(iron?.points[0].has_record).toBe(false);
    const last = iron?.points[2];
    expect(last?.has_record).toBe(true);
    expect(last?.percent).not.toBeNull();
  });
});
