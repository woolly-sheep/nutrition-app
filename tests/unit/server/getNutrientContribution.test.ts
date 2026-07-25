import { describe, expect, it } from "vitest";
import {
  CONTRIBUTION_NOTICE,
  CONTRIBUTION_YEAR_NOTICE,
  getNutrientContribution,
} from "../../../src/server/api/handlers/getNutrientContribution";
import type { MealRecord } from "../../../src/server/api/schemas/meals";
import { loadSeed } from "../../../src/seed/loadSeed";

const seed = loadSeed();

function meal(items: MealRecord["items"], date = "2026-07-24"): MealRecord {
  return {
    meal_id: `meal_${date}`,
    date,
    meal_type: "lunch",
    items,
    recorded_at: `${date}T00:00:00.000Z`,
  };
}

describe("getNutrientContribution", () => {
  it("returns has_records=false with resolved nutrient meta on empty days", async () => {
    const result = await getNutrientContribution("2026-07-24", "protein_g", "day", {
      seed,
      loadMeals: async () => [],
    });
    expect(result.has_records).toBe(false);
    expect(result.foods).toEqual([]);
    expect(result.nutrient_name).toBe("たんぱく質");
    expect(result.unit).toBe("g");
    expect(result.notice).toBe(CONTRIBUTION_NOTICE);
  });

  it("breaks a recorded day down by food, largest first, with display names", async () => {
    const result = await getNutrientContribution("2026-07-24", "protein_g", "day", {
      seed,
      loadMeals: async () => [
        meal([
          { food_id: "food_rice_cooked_white_001", intake_g: 150 },
          { food_id: "food_nattoo_001", intake_g: 50 },
        ]),
      ],
    });
    expect(result.has_records).toBe(true);
    expect(result.total_amount).toBeGreaterThan(0);
    expect(result.foods.length).toBeGreaterThan(0);
    // display names are resolved, not raw ids
    expect(result.foods[0].display_name).not.toBe(result.foods[0].food_id);
    // largest-first ordering
    for (let i = 1; i < result.foods.length; i += 1) {
      expect(result.foods[i - 1].amount).toBeGreaterThanOrEqual(
        result.foods[i].amount,
      );
    }
    // percentages relate to the total
    const sumPercent =
      result.foods.reduce((s, f) => s + f.percent, 0) + result.other_percent;
    expect(sumPercent).toBeCloseTo(100, 3);
  });

  it("year window aggregates the trailing 365 days and excludes older meals", async () => {
    const result = await getNutrientContribution(
      "2026-07-24",
      "protein_g",
      "year",
      {
        seed,
        // loadMeals is called with no date for the year window → return all
        loadMeals: async () => [
          meal([{ food_id: "food_nattoo_001", intake_g: 50 }], "2026-01-10"), // inside
          meal([{ food_id: "food_rice_cooked_white_001", intake_g: 150 }], "2020-01-01"), // older than 365d
        ],
      },
    );
    expect(result.window).toBe("year");
    expect(result.notice).toBe(CONTRIBUTION_YEAR_NOTICE);
    const ids = result.foods.map((f) => f.food_id);
    expect(ids).toContain("food_nattoo_001");
    expect(ids).not.toContain("food_rice_cooked_white_001");
  });

  it("day window defaults and keeps the single-day notice", async () => {
    const result = await getNutrientContribution(
      "2026-07-24",
      "protein_g",
      undefined,
      { seed, loadMeals: async () => [] },
    );
    expect(result.window).toBe("day");
    expect(result.notice).toBe(CONTRIBUTION_NOTICE);
  });
});
