import { describe, expect, it, vi } from "vitest";
import { updateMeal } from "../../../src/server/api/handlers/updateMeal";
import type { MealRecord } from "../../../src/server/api/schemas/meals";
import { loadSeed } from "../../../src/seed/loadSeed";

const seed = loadSeed();

const existing: MealRecord = {
  meal_id: "meal_1",
  date: "2026-07-17",
  meal_type: "lunch",
  items: [{ food_id: "food_rice_cooked_white_001", intake_g: 150 }],
  recorded_at: "2026-07-17T00:00:00.000Z",
};

function fakePersist(updated: MealRecord | null) {
  return vi.fn(async (_id: string, items: MealRecord["items"]) =>
    updated === null ? null : { ...updated, items },
  );
}

describe("updateMeal", () => {
  it("replaces items with the same validation rules as saving", async () => {
    const persist = fakePersist(existing);
    const result = await updateMeal(
      "meal_1",
      { items: [{ food_id: "food_rice_cooked_white_001", intake_g: 200 }] },
      seed,
      persist,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.meal.items[0].intake_g).toBe(200);
      expect(result.meal.date).toBe("2026-07-17");
    }
    expect(persist).toHaveBeenCalledWith("meal_1", [
      { food_id: "food_rice_cooked_white_001", intake_g: 200 },
    ]);
  });

  it("rejects empty items — deleting the record is the explicit path", async () => {
    const result = await updateMeal("meal_1", { items: [] }, seed, fakePersist(existing));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problem.status).toBe(422);
      expect(result.problem.errors).toContain("empty_items");
    }
  });

  it("rejects unknown foods and invalid grams with codes only", async () => {
    const result = await updateMeal(
      "meal_1",
      { items: [{ food_id: "food_unknown", intake_g: -1 }] },
      seed,
      fakePersist(existing),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problem.errors).toContain("items[0].unknown_food");
      expect(result.problem.errors).toContain("items[0].invalid_intake_g");
      expect(JSON.stringify(result.problem)).not.toContain("food_unknown");
    }
  });

  it("returns 404 for an unknown meal id", async () => {
    const result = await updateMeal(
      "meal_missing",
      { items: [{ food_id: "food_rice_cooked_white_001", intake_g: 100 }] },
      seed,
      fakePersist(null),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problem.status).toBe(404);
    }
  });
});
