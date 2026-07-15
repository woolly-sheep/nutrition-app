import { summarizeDailyIntake } from "../../../domain/analysis/summarizeDailyIntake";
import type {
  DailySummaryItem,
  ThresholdExceedance,
} from "../../../domain/analysis/summarizeDailyIntake";
import { calculateNutrientIntake } from "../../../domain/nutrient/calculateNutrientIntake";
import { judgeAgainstReference } from "../../../domain/reference/judgeAgainstReference";
import { DISCLAIMER, wordingForJudgment } from "../../../domain/wording/safeWording";
import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { listMeals } from "../../store/mealStore";
import { readProfile, type StoredProfile } from "../../store/profileStore";
import type { MealRecord } from "../schemas/meals";
import {
  DATA_SOURCES,
  type AnalysisExceedanceItem,
  type AnalysisNutrientItem,
  type DailyAnalysisResponse,
} from "../schemas/analysis";

type Dependencies = {
  seed?: Seed;
  loadProfile?: () => Promise<StoredProfile | null>;
  loadMeals?: (date: string) => Promise<MealRecord[]>;
};

/**
 * Daily summary: meals → intake estimate → reference judgment →
 * safe wording. Facts only; nothing here recommends or diagnoses.
 */
export async function getDailyAnalysis(
  date: string,
  {
    seed = loadSeed(),
    loadProfile = readProfile,
    loadMeals = listMeals,
  }: Dependencies = {},
): Promise<DailyAnalysisResponse> {
  const base = {
    date,
    warning_codes: [] as readonly string[],
    disclaimer: DISCLAIMER,
    sources: DATA_SOURCES,
  };

  const profile = await loadProfile();
  if (profile === null) {
    return {
      ...base,
      profile: null,
      profile_required: true,
      has_records: false,
      summary: null,
    };
  }

  const meals = await loadMeals(date);
  const items = meals.flatMap((meal) =>
    meal.items.map((item) => ({
      foodId: item.food_id,
      intakeG: item.intake_g,
    })),
  );
  if (items.length === 0) {
    return {
      ...base,
      profile,
      profile_required: false,
      has_records: false,
      summary: null,
    };
  }

  const calculation = calculateNutrientIntake(items, seed.nutrientAmount);
  const intakeByCode = new Map(
    calculation.totals.map((total) => [total.nutrientCode, total.totalAmount]),
  );
  const judgments = judgeAgainstReference(
    intakeByCode,
    { sex: profile.sex, ageBand: profile.ageBand },
    seed.nutrientReference,
  );
  const summary = summarizeDailyIntake(judgments);

  return {
    ...base,
    profile,
    profile_required: false,
    has_records: true,
    summary: {
      achieved: summary.achieved.map(toResponseItem),
      insufficient: summary.insufficient.map(toResponseItem),
      comparable_count: summary.comparable.length,
      at_least_80_count: summary.atLeast80Count,
      within_goal_count: summary.withinGoalCount,
      ul_reached: summary.ulReached.map((exceedance) =>
        toExceedanceItem(exceedance, meals, seed),
      ),
      dg_over: summary.dgOver.map((exceedance) =>
        toExceedanceItem(exceedance, meals, seed),
      ),
    },
    warning_codes: [...new Set(calculation.warnings.map((w) => w.code))],
  };
}

function toExceedanceItem(
  exceedance: ThresholdExceedance,
  meals: readonly MealRecord[],
  seed: Seed,
): AnalysisExceedanceItem {
  const wording = wordingForJudgment(exceedance.judgment);
  return {
    nutrient_code: exceedance.judgment.nutrientCode,
    nutrient_name: exceedance.judgment.nutrientName,
    unit: exceedance.judgment.unit,
    reference_type: exceedance.judgment.referenceType,
    status: exceedance.judgment.status,
    label: wording.label,
    ...(wording.note ? { note: wording.note } : {}),
    intake_amount: exceedance.judgment.intakeAmount,
    reference_value: exceedance.judgment.referenceValue,
    threshold_value: exceedance.thresholdValue,
    over_amount: exceedance.overAmount,
    percent_of_threshold: exceedance.percentOfThreshold,
    meal_breakdown: mealBreakdown(
      exceedance.judgment.nutrientCode,
      meals,
      seed,
    ),
  };
}

/** Per-meal contribution of one nutrient (参考情報, largest first). */
function mealBreakdown(
  nutrientCode: string,
  meals: readonly MealRecord[],
  seed: Seed,
): { meal_type: string; amount: number }[] {
  return meals
    .map((meal) => {
      const calculation = calculateNutrientIntake(
        meal.items.map((item) => ({
          foodId: item.food_id,
          intakeG: item.intake_g,
        })),
        seed.nutrientAmount,
      );
      const total = calculation.totals.find(
        (candidate) => candidate.nutrientCode === nutrientCode,
      );
      return { meal_type: meal.meal_type, amount: total?.totalAmount ?? 0 };
    })
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

function toResponseItem(item: DailySummaryItem): AnalysisNutrientItem {
  const wording = wordingForJudgment(item.judgment);
  return {
    nutrient_code: item.judgment.nutrientCode,
    nutrient_name: item.judgment.nutrientName,
    unit: item.judgment.unit,
    reference_type: item.judgment.referenceType,
    status: item.judgment.status,
    label: wording.label,
    ...(wording.note ? { note: wording.note } : {}),
    intake_amount: item.judgment.intakeAmount,
    reference_value: item.judgment.referenceValue,
    ...(item.percentOfReference !== undefined
      ? { percent_of_reference: item.percentOfReference }
      : {}),
    ...(item.remainingAmount !== undefined
      ? { remaining_amount: item.remainingAmount }
      : {}),
  };
}
