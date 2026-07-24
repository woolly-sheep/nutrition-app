import { describe, expect, it } from "vitest";
import { evaluateFoodUntracked } from "../../../src/domain/analysis/foodUntrackedNutrients";
import type { UserProfile } from "../../../src/domain/reference/types";

const male: UserProfile = { sex: "male", ageBand: "adult_30_49" };

describe("evaluateFoodUntracked", () => {
  it("compares recorded omega-3 supplement against the profile AI", () => {
    const results = evaluateFoodUntracked(new Map([["omega3_g", 1.1]]), male);
    expect(results).toHaveLength(1);
    expect(results[0].nutrientCode).toBe("omega3_g");
    // 30-49 male AI = 2.2 → 1.1 is 50%
    expect(results[0].ai).toBe(2.2);
    expect(results[0].percentOfAi).toBeCloseTo(50, 5);
  });

  it("uses sex-specific AI values", () => {
    const female = evaluateFoodUntracked(new Map([["omega3_g", 1.7]]), {
      sex: "female",
      ageBand: "adult_30_49",
    });
    expect(female[0].ai).toBe(1.7);
    expect(female[0].percentOfAi).toBeCloseTo(100, 5);
  });

  it("stays empty when nothing was recorded", () => {
    expect(evaluateFoodUntracked(new Map([["iron_mg", 5]]), male)).toEqual([]);
  });
});
