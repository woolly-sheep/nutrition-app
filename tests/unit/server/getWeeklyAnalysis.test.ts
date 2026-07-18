import { describe, expect, it } from "vitest";
import { getWeeklyAnalysis } from "../../../src/server/api/handlers/getWeeklyAnalysis";
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

describe("getWeeklyAnalysis", () => {
  it("evaluates the Monday-start week only up to the requested date", async () => {
    // 2026-07-15 is a Wednesday → evaluate Mon 7/13 .. Wed 7/15.
    const result = await getWeeklyAnalysis("2026-07-15", {
      seed,
      loadProfile: async () => profile,
      loadMeals: async () => [],
    });
    expect(result.week_start).toBe("2026-07-13");
    expect(result.week_end).toBe("2026-07-19");
    expect(result.missing_dates).toEqual([
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
    ]);
    expect(result.recorded_dates).toHaveLength(0);
  });

  it("averages over recorded days only and lists missing days", async () => {
    const mealsByDate = new Map<string, MealRecord[]>([
      ["2026-07-13", [meal("2026-07-13", [{ food_id: "food_kiwi_raw_001", intake_g: 160 }])]],
      ["2026-07-15", [meal("2026-07-15", [{ food_id: "food_kiwi_raw_001", intake_g: 80 }])]],
    ]);
    const result = await getWeeklyAnalysis("2026-07-15", {
      seed,
      loadProfile: async () => profile,
      loadMeals: async (date) => mealsByDate.get(date) ?? [],
    });
    expect(result.recorded_dates).toEqual(["2026-07-13", "2026-07-15"]);
    expect(result.missing_dates).toEqual(["2026-07-14"]);

    const vitaminC = result.nutrients.find(
      (nutrient) => nutrient.nutrient_code === "vitamin_c_mg",
    );
    // kiwi 71mg/100g vs RDA 100mg: 160g→113.6%, 80g→56.8%
    expect(vitaminC).toBeDefined();
    expect(vitaminC!.recorded_days).toBe(2);
    expect(vitaminC!.average_percent).toBeCloseTo((113.6 + 56.8) / 2, 1);
    expect(vitaminC!.daily.map((cell) => cell.percent === null)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("evaluates all seven days for a past week (Sunday anchor)", async () => {
    // 2026-07-12 is a Sunday → evaluate Mon 7/6 .. Sun 7/12 in full.
    const result = await getWeeklyAnalysis("2026-07-12", {
      seed,
      loadProfile: async () => profile,
      loadMeals: async (date) =>
        date === "2026-07-08"
          ? [meal("2026-07-08", [{ food_id: "food_kiwi_raw_001", intake_g: 100 }])]
          : [],
    });
    expect(result.week_start).toBe("2026-07-06");
    expect(result.week_end).toBe("2026-07-12");
    expect(result.recorded_dates).toEqual(["2026-07-08"]);
    expect(result.missing_dates).toHaveLength(6);
  });

  it("requires a profile before reporting", async () => {
    const result = await getWeeklyAnalysis("2026-07-15", {
      seed,
      loadProfile: async () => null,
      loadMeals: async () => [],
    });
    expect(result.profile_required).toBe(true);
    expect(result.nutrients).toHaveLength(0);
  });
});
