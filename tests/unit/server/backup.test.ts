import { describe, expect, it, vi } from "vitest";
import { getBackup, restoreBackup } from "../../../src/server/api/handlers/backup";
import { loadSeed } from "../../../src/seed/loadSeed";
import type { MealRecord } from "../../../src/server/api/schemas/meals";

const seed = loadSeed();

function validMeal(): MealRecord {
  return {
    date: "2026-07-22",
    meal_type: "breakfast",
    meal_id: "m1",
    recorded_at: "2026-07-22T00:00:00Z",
    items: [{ food_id: "food_egg_raw_001", intake_g: 50 }],
  };
}

describe("getBackup", () => {
  it("bundles version, profile and meals", async () => {
    const backup = await getBackup({
      loadMeals: async () => [validMeal()],
      loadProfile: async () => ({ sex: "male", ageBand: "adult_30_49" }),
    });
    expect(backup.version).toBe(1);
    expect(backup.meals).toHaveLength(1);
    expect(backup.profile?.sex).toBe("male");
  });
});

describe("restoreBackup", () => {
  it("restores a valid payload and replaces meals", async () => {
    const saveMeals = vi.fn(async () => {});
    const saveProfile = vi.fn(async () => {});
    const result = await restoreBackup(
      {
        version: 1,
        meals: [validMeal()],
        profile: { sex: "female", birthDate: "2000-03-03" },
      },
      { seed, saveMeals, saveProfile },
    );
    expect(result.ok).toBe(true);
    expect(saveMeals).toHaveBeenCalledOnce();
    expect(saveProfile).toHaveBeenCalledOnce();
  });

  it("writes nothing when a meal is invalid", async () => {
    const saveMeals = vi.fn(async () => {});
    const bad = { ...validMeal(), items: [{ food_id: "nope", intake_g: 50 }] };
    const result = await restoreBackup(
      { meals: [bad], profile: null },
      { seed, saveMeals, saveProfile: vi.fn() },
    );
    expect(result.ok).toBe(false);
    expect(saveMeals).not.toHaveBeenCalled();
  });

  it("rejects a non-array meals field", async () => {
    const result = await restoreBackup(
      { meals: "oops" },
      { seed, saveMeals: vi.fn(), saveProfile: vi.fn() },
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid profile without writing", async () => {
    const saveMeals = vi.fn(async () => {});
    const result = await restoreBackup(
      { meals: [validMeal()], profile: { sex: "x", birthDate: "y" } },
      { seed, saveMeals, saveProfile: vi.fn() },
    );
    expect(result.ok).toBe(false);
    expect(saveMeals).not.toHaveBeenCalled();
  });
});
