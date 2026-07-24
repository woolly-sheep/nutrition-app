import { recommendCandidates } from "../../../domain/analysis/recommendCandidates";
import { summarizeDailyIntake } from "../../../domain/analysis/summarizeDailyIntake";
import { calculateNutrientIntake } from "../../../domain/nutrient/calculateNutrientIntake";
import { estimateIntakeAmount } from "../../../domain/nutrient/estimateIntakeAmount";
import { judgeAgainstReference } from "../../../domain/reference/judgeAgainstReference";
import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { listMeals } from "../../store/mealStore";
import { readProfile, type StoredProfile } from "../../store/profileStore";
import { resolveProfileForDate } from "../profileResolution";
import type { MealRecord } from "../schemas/meals";

export type FoodCandidateItem = {
  food_id: string;
  display_name: string;
  portion_g: number;
  /** UnitConversion display label ("1切れ") when the portion came from it. */
  portion_label: string | null;
  estimated_kcal: number | null;
  target_nutrient_code: string;
  target_nutrient_name: string;
  unit: string;
  amount_in_portion: number;
  percent_of_shortfall: number;
};

export type FoodCandidatesResponse = {
  date: string;
  /** false when there is no analysis context to tie candidates to. */
  has_analysis: boolean;
  candidates: readonly FoodCandidateItem[];
  /** Mandatory notice (UI design v0.3 §2 / recommendation boundary). */
  notice: string;
};

export const CANDIDATE_NOTICE =
  "出典: 食品成分表(八訂)。含有量に基づく候補で、摂取の推奨ではありません";

type Dependencies = {
  seed?: Seed;
  loadProfile?: () => Promise<StoredProfile | null>;
  loadMeals?: (date: string) => Promise<MealRecord[]>;
};

/**
 * 不足を補う候補 — tied to the same daily analysis the home/analysis
 * screens show (recommendation boundary: candidates require an analysis
 * context). No records or no profile → no candidates.
 */
export async function getFoodCandidates(
  date: string,
  {
    seed = loadSeed(),
    loadProfile = readProfile,
    loadMeals = listMeals,
  }: Dependencies = {},
): Promise<FoodCandidatesResponse> {
  const empty: FoodCandidatesResponse = {
    date,
    has_analysis: false,
    candidates: [],
    notice: CANDIDATE_NOTICE,
  };

  const profile = await loadProfile();
  if (profile === null) {
    return empty;
  }
  const meals = await loadMeals(date);
  const items = meals.flatMap((meal) =>
    meal.items.map((item) => ({
      foodId: item.food_id,
      intakeG: item.intake_g,
    })),
  );
  if (items.length === 0) {
    return empty;
  }

  const calculation = calculateNutrientIntake(items, seed.nutrientAmount);
  const intakeByCode = new Map(
    calculation.totals.map((total) => [total.nutrientCode, total.totalAmount]),
  );
  const resolved = resolveProfileForDate(profile, date);
  if (!resolved.ok) {
    return empty;
  }
  const judgments = judgeAgainstReference(
    intakeByCode,
    resolved.profile,
    seed.nutrientReference,
  );
  const summary = summarizeDailyIntake(judgments);
  const candidates = recommendCandidates(
    summary.insufficient,
    seed.nutrientAmount,
    seed.unitConversion,
  );

  return {
    date,
    has_analysis: true,
    candidates: candidates.map((candidate) => ({
      food_id: candidate.foodId,
      display_name: displayNameOf(candidate.foodId, seed),
      portion_g: candidate.portionG,
      portion_label: candidate.portionLabel,
      estimated_kcal: estimatedKcal(candidate.foodId, candidate.portionG, seed),
      target_nutrient_code: candidate.targetNutrientCode,
      target_nutrient_name: candidate.targetNutrientName,
      unit: candidate.unit,
      amount_in_portion: candidate.amountInPortion,
      percent_of_shortfall: candidate.percentOfShortfall,
    })),
    notice: CANDIDATE_NOTICE,
  };
}

function displayNameOf(foodId: string, seed: Seed): string {
  return (
    seed.foodMaster.find((food) => food.food_id === foodId)?.display_name ??
    foodId
  );
}

function estimatedKcal(
  foodId: string,
  intakeG: number,
  seed: Seed,
): number | null {
  const energy = seed.nutrientAmount.find(
    (record) =>
      record.food_id === foodId && record.nutrient_code === "energy_kcal",
  );
  if (typeof energy?.amount_per_100g !== "number") {
    return null;
  }
  return estimateIntakeAmount(intakeG, energy.amount_per_100g);
}
