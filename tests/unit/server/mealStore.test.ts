import { describe, expect, it } from "vitest";
import {
  appendMeal,
  listMeals,
} from "../../../src/server/store/mealStore";

/**
 * appendMeal merge semantics (one 区分 = one block). The suite runs against an
 * isolated NUTRITION_DATA_DIR (tests/setup/isolate-data-dir.ts), so real disk
 * writes are safe here. Each test uses a distinct date to stay independent.
 */
describe("appendMeal", () => {
  it("creates a new record when the day has no meal of that type yet", async () => {
    const created = await appendMeal({
      date: "2020-01-01",
      meal_type: "breakfast",
      items: [{ food_id: "food_rice_cooked_white_001", intake_g: 150 }],
    });
    expect(created.meal_id).toMatch(/^meal_/);

    const meals = await listMeals("2020-01-01");
    expect(meals).toHaveLength(1);
    expect(meals[0].items).toHaveLength(1);
  });

  it("folds a second same-type save into the existing block", async () => {
    const first = await appendMeal({
      date: "2020-01-02",
      meal_type: "lunch",
      items: [{ food_id: "food_rice_cooked_white_001", intake_g: 150 }],
    });
    const second = await appendMeal({
      date: "2020-01-02",
      meal_type: "lunch",
      items: [{ food_id: "food_kiwi_raw_001", intake_g: 100 }],
    });

    // same block: id and recorded_at are preserved, items are appended
    expect(second.meal_id).toBe(first.meal_id);
    expect(second.recorded_at).toBe(first.recorded_at);
    expect(second.items).toHaveLength(2);

    const meals = await listMeals("2020-01-02");
    expect(meals).toHaveLength(1);
    expect(meals[0].items).toEqual([
      { food_id: "food_rice_cooked_white_001", intake_g: 150 },
      { food_id: "food_kiwi_raw_001", intake_g: 100 },
    ]);
  });

  it("keeps different meal types on the same day as separate blocks", async () => {
    await appendMeal({
      date: "2020-01-03",
      meal_type: "breakfast",
      items: [{ food_id: "food_rice_cooked_white_001", intake_g: 150 }],
    });
    await appendMeal({
      date: "2020-01-03",
      meal_type: "dinner",
      items: [{ food_id: "food_kiwi_raw_001", intake_g: 100 }],
    });

    const meals = await listMeals("2020-01-03");
    expect(meals).toHaveLength(2);
    expect(new Set(meals.map((meal) => meal.meal_type))).toEqual(
      new Set(["breakfast", "dinner"]),
    );
  });
});
