import { describe, expect, it } from "vitest";
import { recommendCandidates } from "../../../src/domain/analysis/recommendCandidates";
import { summarizeDailyIntake } from "../../../src/domain/analysis/summarizeDailyIntake";
import { calculateNutrientIntake } from "../../../src/domain/nutrient/calculateNutrientIntake";
import { judgeAgainstReference } from "../../../src/domain/reference/judgeAgainstReference";
import {
  CANDIDATE_NOTICE,
  getFoodCandidates,
} from "../../../src/server/api/handlers/getFoodCandidates";
import { getUsualFoods } from "../../../src/server/api/handlers/getUsualFoods";
import type { MealRecord } from "../../../src/server/api/schemas/meals";
import type { StoredProfile } from "../../../src/server/store/profileStore";
import { loadSeed } from "../../../src/seed/loadSeed";

const seed = loadSeed();
const profile: StoredProfile = { sex: "male", ageBand: "adult_30_49" };

function meal(
  date: string,
  mealType: MealRecord["meal_type"],
  items: MealRecord["items"],
): MealRecord {
  return {
    meal_id: `meal_${date}_${mealType}`,
    date,
    meal_type: mealType,
    items,
    recorded_at: `${date}T00:00:00.000Z`,
  };
}

describe("getUsualFoods", () => {
  it("derives frequent foods for the meal type within 14 days, enriched with names", async () => {
    const meals = [
      meal("2026-07-10", "dinner", [
        { food_id: "food_rice_cooked_white_001", intake_g: 150 },
      ]),
      meal("2026-07-14", "dinner", [
        { food_id: "food_rice_cooked_white_001", intake_g: 180 },
      ]),
      meal("2026-06-01", "dinner", [
        { food_id: "food_egg_raw_001", intake_g: 50 },
      ]),
    ];
    const result = await getUsualFoods(
      "dinner",
      "2026-07-15",
      seed,
      async () => meals,
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].display_name).toBe("白ごはん");
    expect(result.items[0].intake_g).toBe(180);
    expect(result.items[0].estimated_kcal).toBeCloseTo(280.8, 1);
  });
});

describe("getFoodCandidates", () => {
  it("returns no candidates without an analysis context (no records)", async () => {
    const result = await getFoodCandidates("2026-07-15", {
      seed,
      loadProfile: async () => profile,
      loadMeals: async () => [],
    });
    expect(result.has_analysis).toBe(false);
    expect(result.candidates).toHaveLength(0);
    expect(result.notice).toBe(CANDIDATE_NOTICE);
  });

  it("targets the top-2 shortfalls with 2 content-ranked candidates each", async () => {
    const result = await getFoodCandidates("2026-07-15", {
      seed,
      loadProfile: async () => profile,
      loadMeals: async () => [
        meal("2026-07-15", "lunch", [
          { food_id: "food_rice_cooked_white_001", intake_g: 150 },
        ]),
      ],
    });
    expect(result.has_analysis).toBe(true);
    const targets = [
      ...new Set(result.candidates.map((c) => c.target_nutrient_code)),
    ];
    expect(targets).toHaveLength(2);
    expect(result.candidates).toHaveLength(4);
    for (const candidate of result.candidates) {
      expect(candidate.portion_g).toBeGreaterThan(0);
      expect(candidate.percent_of_shortfall).toBeGreaterThan(0);
    }
  });

  it("keeps candidate wording free of effect-guarantee expressions", async () => {
    const result = await getFoodCandidates("2026-07-15", {
      seed,
      loadProfile: async () => profile,
      loadMeals: async () => [
        meal("2026-07-15", "lunch", [
          { food_id: "food_rice_cooked_white_001", intake_g: 150 },
        ]),
      ],
    });
    const serialized = JSON.stringify(result);
    for (const forbidden of ["改善", "治", "予防", "効く", "おすすめ", "推奨します"]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(result.notice).toContain("摂取の推奨ではありません");
  });
});

describe("recommendCandidates (domain)", () => {
  it("uses representative weights when numeric, otherwise 100g", () => {
    const shortfalls = buildShortfalls([
      { food_id: "food_rice_cooked_white_001", intake_g: 150 },
    ]);
    const candidates = recommendCandidates(
      shortfalls,
      seed.nutrientAmount,
      seed.unitConversion,
    );
    for (const candidate of candidates) {
      if (candidate.portionLabel === null) {
        expect(candidate.portionG).toBe(100);
      } else {
        expect(candidate.portionG).toBeGreaterThan(0);
      }
    }
  });
});

function buildShortfalls(items: MealRecord["items"]) {
  const calculation = calculateNutrientIntake(
    items.map((item) => ({ foodId: item.food_id, intakeG: item.intake_g })),
    seed.nutrientAmount,
  );
  const intakeByCode = new Map(
    calculation.totals.map((total) => [total.nutrientCode, total.totalAmount]),
  );
  const judgments = judgeAgainstReference(
    intakeByCode,
    { sex: profile.sex, ageBand: profile.ageBand },
    seed.nutrientReference,
  );
  return summarizeDailyIntake(judgments).insufficient;
}
