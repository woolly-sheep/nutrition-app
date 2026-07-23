import { describe, expect, it } from "vitest";
import { getGarden } from "../../../src/server/api/handlers/getGarden";
import { loadSeed } from "../../../src/seed/loadSeed";
import type { MealRecord } from "../../../src/server/api/schemas/meals";
import type { StoredProfile } from "../../../src/server/store/profileStore";

const seed = loadSeed();
const profile: StoredProfile = { sex: "male", ageBand: "adult_30_49" };

function meal(date: string, foodId: string, g: number): MealRecord {
  return {
    date,
    meal_type: "breakfast",
    items: [{ food_id: foodId, intake_g: g }],
    meal_id: `m-${date}`,
    recorded_at: `${date}T00:00:00Z`,
  };
}

describe("getGarden", () => {
  it("requires a profile", async () => {
    const res = await getGarden("2026-07-23", {
      seed,
      loadProfile: async () => null,
      loadMeals: async () => [],
    });
    expect(res.profile_required).toBe(true);
    expect(res.days).toEqual([]);
  });

  it("returns `days` cells ending at the requested date, oldest first", async () => {
    const res = await getGarden("2026-07-23", {
      seed,
      loadProfile: async () => profile,
      loadMeals: async () => [],
      days: 5,
    });
    expect(res.days).toHaveLength(5);
    expect(res.days[0].date).toBe("2026-07-19");
    expect(res.days[4].date).toBe("2026-07-23");
  });

  it("leaves days with no records as null (buds), fills recorded days", async () => {
    const res = await getGarden("2026-07-23", {
      seed,
      loadProfile: async () => profile,
      loadMeals: async (date) =>
        date === "2026-07-23"
          ? [meal(date, "food_spinach_boiled_001", 100)]
          : [],
      days: 3,
    });
    expect(res.days[0].fulfillment).toBeNull();
    expect(res.days[1].fulfillment).toBeNull();
    expect(res.days[2].fulfillment).not.toBeNull();
    expect(res.days[2].fulfillment).toBeGreaterThan(0);
  });
});
