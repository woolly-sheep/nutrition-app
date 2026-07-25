import { describe, expect, it } from "vitest";
import {
  richFoods,
  RICH_FOODS_HISTORY_NOTICE,
} from "../../../src/server/api/handlers/richFoods";
import { loadSeed } from "../../../src/seed/loadSeed";
import { topFoodsByNutrient } from "../../../src/domain/nutrient/topFoodsByNutrient";
import type { MealRecord } from "../../../src/server/api/schemas/meals";

const seed = loadSeed();
const now = () => new Date("2026-07-25T00:00:00Z");

// Two vitamin-C-bearing foods, one eaten inside the window, one outside.
const richC = topFoodsByNutrient(seed, "vitamin_c_mg", 50);
const insideFood = richC[0].food_id;
const outsideFood = richC[1].food_id;

function meal(date: string, foodId: string): MealRecord {
  return {
    date,
    meal_type: "lunch",
    meal_id: `m_${date}_${foodId}`,
    recorded_at: `${date}T00:00:00Z`,
    items: [{ food_id: foodId, intake_g: 100 }],
  };
}

describe("richFoods history scope", () => {
  it("ranks only foods eaten within the last year", async () => {
    const result = await richFoods("vitamin_c_mg", "history", {
      seed,
      now,
      loadMeals: async () => [
        meal("2026-07-20", insideFood), // inside window
        meal("2024-01-01", outsideFood), // older than 365 days
      ],
    });
    expect(result.scope).toBe("history");
    expect(result.notice).toBe(RICH_FOODS_HISTORY_NOTICE);
    const ids = result.foods.map((f) => f.food_id);
    expect(ids).toContain(insideFood);
    expect(ids).not.toContain(outsideFood);
  });

  it("returns no foods when nothing was eaten in the window", async () => {
    const result = await richFoods("vitamin_c_mg", "history", {
      seed,
      now,
      loadMeals: async () => [meal("2020-01-01", insideFood)],
    });
    expect(result.foods).toEqual([]);
  });

  it("all scope ignores history and ranks the whole catalog", async () => {
    const result = await richFoods("vitamin_c_mg", "all", {
      seed,
      now,
      loadMeals: async () => [],
    });
    expect(result.scope).toBe("all");
    expect(result.foods.length).toBeGreaterThan(0);
  });
});
