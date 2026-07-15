import { describe, expect, it } from "vitest";
import { deriveUsualFoods } from "../../../src/domain/meal/deriveUsualFoods";

const meal = (
  date: string,
  mealType: string,
  items: { foodId: string; intakeG: number }[],
) => ({ date, mealType, items });

describe("deriveUsualFoods", () => {
  it("returns foods appearing at least twice for the meal type, most frequent first", () => {
    const usual = deriveUsualFoods(
      [
        meal("2026-07-10", "dinner", [{ foodId: "rice", intakeG: 150 }]),
        meal("2026-07-11", "dinner", [
          { foodId: "rice", intakeG: 150 },
          { foodId: "miso", intakeG: 20 },
        ]),
        meal("2026-07-12", "dinner", [
          { foodId: "rice", intakeG: 180 },
          { foodId: "miso", intakeG: 20 },
        ]),
        meal("2026-07-12", "dinner", [{ foodId: "egg", intakeG: 50 }]),
      ],
      "dinner",
    );
    expect(usual.map((food) => food.foodId)).toEqual(["rice", "miso"]);
    expect(usual[0].occurrences).toBe(3);
  });

  it("uses the grams from the latest occurrence, not an average", () => {
    const usual = deriveUsualFoods(
      [
        meal("2026-07-10", "lunch", [{ foodId: "rice", intakeG: 100 }]),
        meal("2026-07-14", "lunch", [{ foodId: "rice", intakeG: 200 }]),
      ],
      "lunch",
    );
    expect(usual[0].intakeG).toBe(200);
  });

  it("ignores other meal types and single occurrences", () => {
    const usual = deriveUsualFoods(
      [
        meal("2026-07-10", "breakfast", [{ foodId: "egg", intakeG: 50 }]),
        meal("2026-07-11", "breakfast", [{ foodId: "egg", intakeG: 50 }]),
        meal("2026-07-11", "dinner", [{ foodId: "rice", intakeG: 150 }]),
      ],
      "dinner",
    );
    expect(usual).toHaveLength(0);
  });

  it("caps the list at four foods", () => {
    const meals = [];
    for (let day = 1; day <= 2; day += 1) {
      meals.push(
        meal(`2026-07-0${day}`, "dinner", [
          { foodId: "a", intakeG: 1 },
          { foodId: "b", intakeG: 1 },
          { foodId: "c", intakeG: 1 },
          { foodId: "d", intakeG: 1 },
          { foodId: "e", intakeG: 1 },
        ]),
      );
    }
    expect(deriveUsualFoods(meals, "dinner")).toHaveLength(4);
  });
});
