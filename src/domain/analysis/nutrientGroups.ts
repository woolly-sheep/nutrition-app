import type { AnalysisNutrientItem } from "../../server/api/schemas/analysis";

/**
 * Groups the comparable nutrients into 6 "petals" for the home bloom
 * (UI design: 栄養バランスの花). Salt and %E-range DGs are excluded — they
 * are limits (not "more is better"), so growing a petal for them would
 * mislead. Each petal's fill is the mean fulfilment of its members over the
 * days recorded; "achieved" (goal reached) turns the petal gold.
 */

export type NutrientGroupKey =
  | "protein"
  | "fiber"
  | "vitaminFat"
  | "vitaminWater"
  | "mineralA"
  | "mineralB";

/**
 * Six "grow" petals — nutrients where reaching the reference is the goal, so
 * a longer petal always means "closer to good". Energy / fat / carbohydrate
 * (%E balance ranges) and salt (an upper limit) are deliberately excluded:
 * they are not "more is better", so growing a petal for them would mislead.
 */
export const NUTRIENT_GROUPS: {
  key: NutrientGroupKey;
  label: string;
  codes: readonly string[];
}[] = [
  { key: "protein", label: "たんぱく", codes: ["protein_g"] },
  { key: "fiber", label: "繊維", codes: ["dietary_fiber_g"] },
  {
    key: "vitaminFat",
    label: "ビタA・D・E・K",
    codes: ["vitamin_a_ug", "vitamin_d_ug", "vitamin_e_mg", "vitamin_k_ug"],
  },
  {
    key: "vitaminWater",
    label: "ビタB・C",
    codes: [
      "vitamin_b1_mg",
      "vitamin_b2_mg",
      "vitamin_b6_mg",
      "vitamin_b12_ug",
      "niacin_mgne",
      "vitamin_c_mg",
      "folate_ug",
    ],
  },
  { key: "mineralA", label: "カル・鉄・Mg", codes: ["calcium_mg", "iron_mg", "magnesium_mg"] },
  {
    key: "mineralB",
    label: "カリ・亜鉛・銅",
    codes: ["potassium_mg", "zinc_mg", "copper_mg"],
  },
];

export type PetalValue = {
  key: NutrientGroupKey;
  label: string;
  /** Mean fulfilment 0..1+ (uncapped); null when no member is comparable. */
  fulfillment: number | null;
  /**
   * Food-only mean fulfilment 0..1+ — the solid part of the petal. Equals
   * fulfillment when no member has a supplement share. null when unknown.
   */
  foodFulfillment: number | null;
  /** True when the group's mean reaches the reference (gold petal). */
  achieved: boolean;
  /** True when a member exceeded its tolerable upper limit (never gold). */
  overLimit: boolean;
};

export type BloomModel = {
  petals: readonly PetalValue[];
  /** Overall mean fulfilment across all comparable nutrients (0..1+). */
  overall: number | null;
};

/**
 * Builds the bloom model from the daily summary's comparable items
 * (achieved + insufficient). Only items with a numeric percent_of_reference
 * count; groups with none are left as buds (fulfillment null).
 */
export function buildBloomModel(
  comparable: readonly AnalysisNutrientItem[],
  overLimitCodes: ReadonlySet<string> = new Set(),
): BloomModel {
  const percentByCode = new Map<string, number>();
  const foodPercentByCode = new Map<string, number>();
  for (const item of comparable) {
    if (typeof item.percent_of_reference === "number") {
      percentByCode.set(item.nutrient_code, item.percent_of_reference);
      // Food share defaults to the whole when no supplement split is present.
      foodPercentByCode.set(
        item.nutrient_code,
        typeof item.percent_of_reference_food === "number"
          ? item.percent_of_reference_food
          : item.percent_of_reference,
      );
    }
  }

  const petals = NUTRIENT_GROUPS.map((group) => {
    const overLimit = group.codes.some((code) => overLimitCodes.has(code));
    const values = group.codes
      .map((code) => percentByCode.get(code))
      .filter((v): v is number => typeof v === "number");
    if (values.length === 0) {
      return {
        key: group.key,
        label: group.label,
        fulfillment: null,
        foodFulfillment: null,
        achieved: false,
        overLimit,
      };
    }
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length / 100;
    // Food-only mean over the SAME members, so the solid part is never
    // larger than the total petal.
    const foodValues = group.codes
      .filter((code) => percentByCode.has(code))
      .map((code) => foodPercentByCode.get(code) ?? 0);
    const foodMean =
      foodValues.reduce((sum, v) => sum + v, 0) / foodValues.length / 100;
    return {
      key: group.key,
      label: group.label,
      fulfillment: mean,
      foodFulfillment: foodMean,
      // Over the upper limit is never celebrated as achieved (gold).
      achieved: mean >= 1 && !overLimit,
      overLimit,
    };
  });

  const all = [...percentByCode.values()];
  const overall =
    all.length === 0
      ? null
      : all.reduce((sum, v) => sum + v, 0) / all.length / 100;

  return { petals, overall };
}
