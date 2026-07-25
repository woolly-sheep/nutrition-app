import { evaluateFoodUntracked } from "../../../domain/analysis/foodUntrackedNutrients";
import { buildFocusNutrients } from "../../../domain/analysis/focusNutrients";
import type { FocusNutrient } from "../../../domain/analysis/focusNutrients";
import { evaluateNonFoodLimits } from "../../../domain/analysis/nonFoodUpperLimits";
import { summarizeDailyIntake } from "../../../domain/analysis/summarizeDailyIntake";
import type {
  DailySummaryItem,
  ThresholdExceedance,
} from "../../../domain/analysis/summarizeDailyIntake";
import { calculateNutrientIntake } from "../../../domain/nutrient/calculateNutrientIntake";
import {
  combineIntake,
  sumSupplementIntake,
} from "../../../domain/nutrient/supplementIntake";
import { judgeAgainstReference } from "../../../domain/reference/judgeAgainstReference";
import { parseOfficialValue } from "../../../domain/reference/officialValue";
import { DISCLAIMER, wordingForJudgment } from "../../../domain/wording/safeWording";
import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { listMeals } from "../../store/mealStore";
import { readProfile, type StoredProfile } from "../../store/profileStore";
import { listSupplements } from "../../store/supplementStore";
import { resolveProfileForDate } from "../profileResolution";
import type { MealRecord } from "../schemas/meals";
import type { SupplementRecord } from "../schemas/supplements";
import {
  DATA_SOURCES,
  type AnalysisExceedanceItem,
  type AnalysisNutrientItem,
  type DailyAnalysisResponse,
  type FocusNutrientItem,
  type FoodUntrackedItem,
  type NonFoodLimitItem,
} from "../schemas/analysis";

type Dependencies = {
  seed?: Seed;
  loadProfile?: () => Promise<StoredProfile | null>;
  loadMeals?: (date: string) => Promise<MealRecord[]>;
  loadSupplements?: (date: string) => Promise<SupplementRecord[]>;
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
    loadSupplements = listSupplements,
  }: Dependencies = {},
): Promise<DailyAnalysisResponse> {
  const base = {
    date,
    warning_codes: [] as readonly string[],
    disclaimer: DISCLAIMER,
    sources: DATA_SOURCES,
    has_supplements: false,
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

  // Age band follows the evaluated date, so a past day keeps the band
  // that applied on that day (decision-20260724-birthdate-profile).
  const resolved = resolveProfileForDate(profile, date);
  if (!resolved.ok) {
    return {
      ...base,
      profile,
      profile_required: false,
      has_records: false,
      summary: null,
      warning_codes: ["unsupported_age_band"],
    };
  }
  const responseProfile = { ...profile, ageBand: resolved.profile.ageBand };

  const meals = await loadMeals(date);
  const supplements = await loadSupplements(date);
  const supplementByCode = sumSupplementIntake(supplements);
  const hasSupplements = supplementByCode.size > 0;

  const items = meals.flatMap((meal) =>
    meal.items.map((item) => ({
      foodId: item.food_id,
      intakeG: item.intake_g,
    })),
  );
  if (items.length === 0 && !hasSupplements) {
    return {
      ...base,
      profile: responseProfile,
      profile_required: false,
      has_records: false,
      summary: null,
    };
  }

  const calculation = calculateNutrientIntake(items, seed.nutrientAmount);
  const foodByCode = new Map(
    calculation.totals.map((total) => [total.nutrientCode, total.totalAmount]),
  );
  // Reference judgment uses the combined intake; the response keeps the
  // food and supplement shares separate for display
  // (decision-20260724-supplement-intake).
  const combinedByCode = combineIntake(foodByCode, supplementByCode);
  const judgments = judgeAgainstReference(
    combinedByCode,
    resolved.profile,
    seed.nutrientReference,
  );
  const summary = summarizeDailyIntake(judgments);

  // 重点栄養素 board (#34): the DG nutrients individually. Wording is looked
  // up per nutrient from its own DG judgment (SafeWordingService).
  const dgJudgmentByCode = new Map(
    judgments
      .filter((j) => j.referenceType === "tentative_dietary_goal")
      .map((j) => [j.nutrientCode, j]),
  );
  const focusNutrients = buildFocusNutrients(judgments).map((focus) =>
    toFocusItem(focus, dgJudgmentByCode),
  );

  const enrich = (item: DailySummaryItem): AnalysisNutrientItem =>
    withSplit(toResponseItem(item), foodByCode, supplementByCode);

  return {
    ...base,
    has_supplements: hasSupplements,
    profile: responseProfile,
    profile_required: false,
    has_records: true,
    summary: {
      achieved: summary.achieved.map(enrich),
      insufficient: summary.insufficient.map(enrich),
      comparable_count: summary.comparable.length,
      at_least_80_count: summary.atLeast80Count,
      within_goal_count: summary.withinGoalCount,
      ul_reached: summary.ulReached.map((exceedance) =>
        withSplit(
          toExceedanceItem(exceedance, meals, seed),
          foodByCode,
          supplementByCode,
        ),
      ),
      dg_over: summary.dgOver.map((exceedance) =>
        withSplit(
          toExceedanceItem(exceedance, meals, seed),
          foodByCode,
          supplementByCode,
        ),
      ),
      focus_nutrients: focusNutrients,
      non_food_limits: toNonFoodLimits(supplementByCode),
      food_untracked: toFoodUntracked(supplementByCode, resolved.profile),
    },
    warning_codes: [...new Set(calculation.warnings.map((w) => w.code))],
  };
}

function toFoodUntracked(
  supplementByCode: ReadonlyMap<string, number>,
  profile: Parameters<typeof evaluateFoodUntracked>[1],
): FoodUntrackedItem[] {
  return evaluateFoodUntracked(supplementByCode, profile).map((status) => ({
    nutrient_code: status.nutrientCode,
    nutrient_name: status.nutrientName,
    unit: status.unit,
    supplement_amount: status.supplementAmount,
    ai: status.ai,
    percent_of_ai: status.percentOfAi,
    label:
      status.ai !== null
        ? "サプリからの摂取量です（目安量との参考比較）"
        : "サプリからの摂取量です",
    note: `この栄養素は食品からの摂取を追跡していないため、サプリ分のみの表示です。出典: ${status.source}。`,
  }));
}

/** Attaches the food / supplement split to a response item. */
function withSplit<T extends AnalysisNutrientItem>(
  item: T,
  foodByCode: ReadonlyMap<string, number>,
  supplementByCode: ReadonlyMap<string, number>,
): T {
  const food = foodByCode.get(item.nutrient_code) ?? 0;
  const supplement = supplementByCode.get(item.nutrient_code) ?? 0;
  const percentFood =
    item.percent_of_reference !== undefined && item.intake_amount > 0
      ? (item.percent_of_reference * food) / item.intake_amount
      : undefined;
  return {
    ...item,
    food_amount: food,
    supplement_amount: supplement,
    ...(percentFood !== undefined
      ? { percent_of_reference_food: percentFood }
      : {}),
  };
}

function toNonFoodLimits(
  supplementByCode: ReadonlyMap<string, number>,
): NonFoodLimitItem[] {
  return evaluateNonFoodLimits(supplementByCode).map((status) => ({
    nutrient_code: status.nutrientCode,
    nutrient_name: status.nutrientName,
    unit: status.unit,
    supplement_amount: status.supplementAmount,
    limit_value: status.limit,
    percent_of_limit: status.percentOfLimit,
    exceeded: status.exceeded,
    label: status.exceeded
      ? "サプリからの摂取が通常の食品以外の上限量を上回っています（推定）"
      : "サプリからの摂取量です（通常の食品以外の上限量との比較）",
    note: `食品からの摂取はこの上限量の対象外です。出典: ${status.source}。`,
  }));
}

function toExceedanceItem(
  exceedance: ThresholdExceedance,
  meals: readonly MealRecord[],
  seed: Seed,
): AnalysisExceedanceItem {
  const wording = wordingForJudgment(exceedance.judgment);
  const energyRatio = exceedance.judgment.energyRatioPercent;
  const parsedRange =
    energyRatio !== undefined
      ? parseOfficialValue(exceedance.judgment.referenceValue)
      : null;
  return {
    nutrient_code: exceedance.judgment.nutrientCode,
    nutrient_name: exceedance.judgment.nutrientName,
    // %E DGs are judged on the energy share (decision-20260717):
    // report that share with its own unit, never the raw grams.
    unit: energyRatio !== undefined ? "%E" : exceedance.judgment.unit,
    reference_type: exceedance.judgment.referenceType,
    status: exceedance.judgment.status,
    label: wording.label,
    ...(wording.note ? { note: wording.note } : {}),
    intake_amount: energyRatio ?? exceedance.judgment.intakeAmount,
    // withSplit fills these in from the food / supplement maps.
    food_amount: 0,
    supplement_amount: 0,
    reference_value: exceedance.judgment.referenceValue,
    threshold_value: exceedance.thresholdValue,
    over_amount: exceedance.overAmount,
    percent_of_threshold: exceedance.percentOfThreshold,
    // per-meal %E is not meaningful (mixed units) — omit for %E items
    meal_breakdown:
      energyRatio !== undefined
        ? []
        : mealBreakdown(exceedance.judgment.nutrientCode, meals, seed),
    ...(parsedRange?.kind === "range" ? { range_min: parsedRange.min } : {}),
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

function toFocusItem(
  focus: FocusNutrient,
  dgJudgmentByCode: ReadonlyMap<string, Parameters<typeof wordingForJudgment>[0]>,
): FocusNutrientItem {
  const judgment = dgJudgmentByCode.get(focus.nutrientCode);
  const label = judgment ? wordingForJudgment(judgment).label : "";
  return {
    nutrient_code: focus.nutrientCode,
    nutrient_name: focus.nutrientName,
    unit: focus.unit,
    direction: focus.direction,
    status: focus.status,
    label,
    value: focus.value,
    goal_value: focus.goalValue,
    ...(focus.rangeMin !== undefined ? { range_min: focus.rangeMin } : {}),
    ...(focus.rangeMax !== undefined ? { range_max: focus.rangeMax } : {}),
    fill_ratio: focus.fillRatio,
    reached: focus.reached,
    remaining: focus.remaining,
  };
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
    // withSplit fills these in from the food / supplement maps.
    food_amount: 0,
    supplement_amount: 0,
    reference_value: item.judgment.referenceValue,
    ...(item.percentOfReference !== undefined
      ? { percent_of_reference: item.percentOfReference }
      : {}),
    ...(item.remainingAmount !== undefined
      ? { remaining_amount: item.remainingAmount }
      : {}),
  };
}
