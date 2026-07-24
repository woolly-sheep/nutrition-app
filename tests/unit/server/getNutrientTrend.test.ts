import { describe, expect, it } from "vitest";
import {
  getNutrientTrend,
  TREND_NOTICE,
} from "../../../src/server/api/handlers/getNutrientTrend";
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

describe("getNutrientTrend", () => {
  it("requires a profile before building a series", async () => {
    const result = await getNutrientTrend("2026-07-24", "iron_mg", 7, {
      seed,
      loadProfile: async () => null,
      loadMeals: async () => [],
    });
    expect(result.profile_required).toBe(true);
    expect(result.points).toEqual([]);
  });

  it("returns oldest→newest points ending at the requested date", async () => {
    const result = await getNutrientTrend("2026-07-24", "iron_mg", 7, {
      seed,
      loadProfile: async () => profile,
      loadMeals: async () => [],
    });
    expect(result.points).toHaveLength(7);
    expect(result.points[0].date).toBe("2026-07-18");
    expect(result.points[6].date).toBe("2026-07-24");
  });

  it("marks days without records as null, never zero-filled", async () => {
    const recorded = "2026-07-24";
    const result = await getNutrientTrend(recorded, "iron_mg", 3, {
      seed,
      loadProfile: async () => profile,
      loadMeals: async (date) =>
        date === recorded
          ? [meal(date, [{ food_id: "food_nattoo_001", intake_g: 100 }])]
          : [],
    });
    expect(result.recorded_days).toBe(1);
    const last = result.points[2];
    expect(last.has_record).toBe(true);
    expect(last.percent).not.toBeNull();
    expect(result.points[0].percent).toBeNull();
    expect(result.points[0].has_record).toBe(false);
    expect(result.notice).toBe(TREND_NOTICE);
  });

  it("counts recorded days below the reference (100%)", async () => {
    const result = await getNutrientTrend("2026-07-24", "iron_mg", 2, {
      seed,
      loadProfile: async () => profile,
      loadMeals: async () => [
        meal("d", [{ food_id: "food_nattoo_001", intake_g: 10 }]),
      ],
    });
    // a tiny portion is well below the iron reference on every recorded day
    expect(result.days_below_reference).toBe(result.recorded_days);
    expect(result.recorded_days).toBeGreaterThan(0);
  });
});
