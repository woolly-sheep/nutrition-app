import type {
  NutrientAmountRecord,
  UnitConversionRecord,
} from "../../seed/types";
import type { DailySummaryItem } from "./summarizeDailyIntake";

/**
 * RecommendationCandidateService (UI design v0.3 addendum §2, within the
 * recommendation boundary): candidate foods for today's top shortfalls,
 * ranked by official content only. Facts — never effect guarantees,
 * never supplements, never disease-specific suggestions. Candidates are
 * tied to the day's analysis result via the shortfall items passed in.
 */

export type FoodCandidate = {
  foodId: string;
  targetNutrientCode: string;
  targetNutrientName: string;
  unit: string;
  /** Suggested display portion (representative weight, else 100g). */
  portionG: number;
  /** Display label of the portion when it came from UnitConversion. */
  portionLabel: string | null;
  /** Nutrient amount contained in the portion. */
  amountInPortion: number;
  /** amountInPortion ÷ today's remaining amount × 100. */
  percentOfShortfall: number;
};

export const CANDIDATE_TARGET_NUTRIENTS = 2;
export const CANDIDATES_PER_NUTRIENT = 2;

export function recommendCandidates(
  shortfalls: readonly DailySummaryItem[],
  nutrientAmounts: readonly NutrientAmountRecord[],
  unitConversions: readonly UnitConversionRecord[],
): FoodCandidate[] {
  return shortfalls
    .filter((item) => (item.remainingAmount ?? 0) > 0)
    .slice(0, CANDIDATE_TARGET_NUTRIENTS)
    .flatMap((item) =>
      candidatesForShortfall(item, nutrientAmounts, unitConversions),
    );
}

function candidatesForShortfall(
  shortfall: DailySummaryItem,
  nutrientAmounts: readonly NutrientAmountRecord[],
  unitConversions: readonly UnitConversionRecord[],
): FoodCandidate[] {
  const nutrientCode = shortfall.judgment.nutrientCode;
  const remaining = shortfall.remainingAmount ?? 0;

  return nutrientAmounts
    .filter(
      (record) =>
        record.nutrient_code === nutrientCode &&
        typeof record.amount_per_100g === "number" &&
        record.amount_per_100g > 0,
    )
    .sort(
      (a, b) => (b.amount_per_100g as number) - (a.amount_per_100g as number),
    )
    .slice(0, CANDIDATES_PER_NUTRIENT)
    .map((record) => {
      const portion = portionFor(record.food_id, unitConversions);
      const amountInPortion =
        ((record.amount_per_100g as number) * portion.grams) / 100;
      return {
        foodId: record.food_id,
        targetNutrientCode: nutrientCode,
        targetNutrientName: shortfall.judgment.nutrientName,
        unit: shortfall.judgment.unit,
        portionG: portion.grams,
        portionLabel: portion.label,
        amountInPortion,
        percentOfShortfall: (amountInPortion / remaining) * 100,
      };
    });
}

function portionFor(
  foodId: string,
  unitConversions: readonly UnitConversionRecord[],
): { grams: number; label: string | null } {
  const conversion = unitConversions.find(
    (record) =>
      record.food_id === foodId &&
      typeof record.representative_weight_g === "number" &&
      (record.representative_weight_g as number) > 0,
  );
  if (conversion) {
    return {
      grams: conversion.representative_weight_g as number,
      label: conversion.display_unit,
    };
  }
  return { grams: 100, label: null };
}
