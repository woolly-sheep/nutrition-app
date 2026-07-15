import { describe, expect, it, vi } from "vitest";
import { loadSeed } from "../../../src/seed/loadSeed";
import { createMeal } from "../../../src/server/api/handlers/createMeal";
import type {
  CreateMealRequest,
  MealRecord,
} from "../../../src/server/api/schemas/meals";

const seed = loadSeed();

function fakeSave(input: CreateMealRequest): Promise<MealRecord> {
  return Promise.resolve({
    ...input,
    meal_id: "meal_test",
    recorded_at: "2026-07-15T00:00:00.000Z",
  });
}

const validBody = {
  date: "2026-07-15",
  meal_type: "dinner",
  items: [{ food_id: "food_rice_cooked_white_001", intake_g: 150 }],
};

describe("createMeal", () => {
  it("saves a valid meal", async () => {
    const result = await createMeal(validBody, seed, fakeSave);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.meal.meal_id).toBe("meal_test");
      expect(result.meal.items).toEqual(validBody.items);
    }
  });

  it("persists only schema fields, dropping extras from the client", async () => {
    const save = vi.fn(fakeSave);
    const body = {
      ...validBody,
      note: "should be dropped",
      items: [{ ...validBody.items[0], memo: "dropped too" }],
    };
    const result = await createMeal(body, seed, save);
    expect(result.ok).toBe(true);
    expect(save).toHaveBeenCalledWith({
      date: "2026-07-15",
      meal_type: "dinner",
      items: [{ food_id: "food_rice_cooked_white_001", intake_g: 150 }],
    });
  });

  it("rejects a non-object body", async () => {
    const result = await createMeal(null, seed, fakeSave);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problem.status).toBe(422);
      expect(result.problem.errors).toContain("invalid_body");
    }
  });

  it.each([
    [{ ...validBody, date: "2026/07/15" }, "invalid_date"],
    [{ ...validBody, meal_type: "brunch" }, "invalid_meal_type"],
    [{ ...validBody, items: [] }, "empty_items"],
  ])("rejects invalid fields with code %#", async (body, code) => {
    const result = await createMeal(body, seed, fakeSave);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problem.errors).toContain(code);
    }
  });

  it.each([0, -10, Number.NaN, 99999])(
    "rejects non-positive/absurd grams: %s",
    async (grams) => {
      const body = {
        ...validBody,
        items: [{ food_id: "food_rice_cooked_white_001", intake_g: grams }],
      };
      const result = await createMeal(body, seed, fakeSave);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.problem.errors).toContain("items[0].invalid_intake_g");
      }
    },
  );

  it("rejects food ids that are not in the frozen seed", async () => {
    const body = {
      ...validBody,
      items: [{ food_id: "food_unknown_999", intake_g: 100 }],
    };
    const result = await createMeal(body, seed, fakeSave);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problem.errors).toContain("items[0].unknown_food");
    }
  });

  it("keeps validation error details free of submitted values", async () => {
    const body = {
      ...validBody,
      items: [{ food_id: "food_unknown_999", intake_g: -5 }],
    };
    const result = await createMeal(body, seed, fakeSave);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const serialized = JSON.stringify(result.problem);
      expect(serialized).not.toContain("food_unknown_999");
      expect(serialized).not.toContain("-5");
    }
  });
});
