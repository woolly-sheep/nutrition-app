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

  it("round-trips supplements and clears them when the array is empty", async () => {
    const supplement = {
      supplement_id: "sup_1",
      date: "2026-07-24",
      product_name: "iron",
      amounts: [{ nutrient_code: "iron_mg", amount: 5 }],
      recorded_at: "2026-07-24T00:00:00.000Z",
    };
    const exported = await getBackup({
      loadMeals: async () => [validMeal()],
      loadProfile: async () => null,
      loadSupplements: async () => [supplement],
    });
    expect(exported.supplements).toHaveLength(1);

    const saveSupplements = vi.fn(async () => {});
    const result = await restoreBackup(
      { version: 1, meals: [validMeal()], supplements: [supplement] },
      { seed, saveMeals: vi.fn(), saveProfile: vi.fn(), saveSupplements },
    );
    expect(result.ok).toBe(true);
    expect(saveSupplements).toHaveBeenCalledWith([supplement]);
  });

  it("rejects a supplement with an unknown nutrient without writing", async () => {
    const saveMeals = vi.fn(async () => {});
    const result = await restoreBackup(
      {
        meals: [validMeal()],
        supplements: [
          {
            supplement_id: "s",
            date: "2026-07-24",
            product_name: "x",
            amounts: [{ nutrient_code: "energy_kcal", amount: 1 }],
            recorded_at: "2026-07-24T00:00:00.000Z",
          },
        ],
      },
      { seed, saveMeals, saveProfile: vi.fn(), saveSupplements: vi.fn() },
    );
    expect(result.ok).toBe(false);
    expect(saveMeals).not.toHaveBeenCalled();
  });

  it("round-trips product presets", async () => {
    const product = {
      product_id: "sprod_1",
      name: "エビオス錠",
      serving_count: 10,
      serving_unit: "錠",
      amounts: [{ nutrient_code: "vitamin_b1_mg", amount: 0.6 }],
      created_at: "2026-07-24T00:00:00.000Z",
    };
    const exported = await getBackup({
      loadMeals: async () => [validMeal()],
      loadProfile: async () => null,
      loadSupplements: async () => [],
      loadSupplementProducts: async () => [product],
    });
    expect(exported.supplement_products).toHaveLength(1);

    const saveSupplementProducts = vi.fn(async () => {});
    const result = await restoreBackup(
      { version: 1, meals: [validMeal()], supplement_products: [product] },
      {
        seed,
        saveMeals: vi.fn(),
        saveProfile: vi.fn(),
        saveSupplements: vi.fn(),
        saveSupplementProducts,
      },
    );
    expect(result.ok).toBe(true);
    expect(saveSupplementProducts).toHaveBeenCalledWith([product]);
  });

  it("round-trips recipe presets", async () => {
    const recipe = {
      recipe_id: "rec_1",
      name: "いつもの朝食",
      items: [{ food_id: "food_egg_raw_001", intake_g: 50 }],
      created_at: "2026-07-25T00:00:00.000Z",
    };
    const exported = await getBackup({
      loadMeals: async () => [validMeal()],
      loadProfile: async () => null,
      loadSupplements: async () => [],
      loadSupplementProducts: async () => [],
      loadRecipes: async () => [recipe],
    });
    expect(exported.recipes).toHaveLength(1);

    const saveRecipes = vi.fn(async () => {});
    const result = await restoreBackup(
      { version: 1, meals: [validMeal()], recipes: [recipe] },
      {
        seed,
        saveMeals: vi.fn(),
        saveProfile: vi.fn(),
        saveSupplements: vi.fn(),
        saveSupplementProducts: vi.fn(),
        saveRecipes,
      },
    );
    expect(result.ok).toBe(true);
    expect(saveRecipes).toHaveBeenCalledWith([recipe]);
  });

  it("rejects a recipe with an unknown food without writing", async () => {
    const saveRecipes = vi.fn(async () => {});
    const bad = {
      recipe_id: "rec_2",
      name: "変な料理",
      items: [{ food_id: "nope", intake_g: 50 }],
      created_at: "2026-07-25T00:00:00.000Z",
    };
    const result = await restoreBackup(
      { version: 1, meals: [validMeal()], recipes: [bad] },
      {
        seed,
        saveMeals: vi.fn(),
        saveProfile: vi.fn(),
        saveSupplements: vi.fn(),
        saveSupplementProducts: vi.fn(),
        saveRecipes,
      },
    );
    expect(result.ok).toBe(false);
    expect(saveRecipes).not.toHaveBeenCalled();
  });
});
