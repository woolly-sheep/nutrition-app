/**
 * GET /api/foods — search over the frozen FoodMaster catalog.
 * Empty result is a normal 200 response (API design v0.2 §6), never 404.
 */

export type FoodUnitOption = {
  display_unit: string;
  /**
   * Representative weight for one unit; null when no usable value exists.
   * From the frozen seed when source is "official_seed", or from the
   * standard weight reference (a 推定 estimate) when "reference_estimate".
   */
  representative_weight_g: number | null;
  confidence_level: string;
  warning_code: string | null;
  /** Where the weight came from — drives the 推定 labelling in the UI. */
  source: "official_seed" | "reference_estimate";
  /** Source note for reference estimates; null for seed-only options. */
  source_note: string | null;
};

export type FoodSearchItem = {
  food_id: string;
  display_name: string;
  official_food_name: string;
  /** Display-only reference value; null when the official value is non-numeric. */
  energy_kcal_per_100g: number | null;
  /** Display-only representative amounts. Input stays explicit grams first. */
  unit_options: readonly FoodUnitOption[];
};

export type FoodSearchResponse = {
  foods: readonly FoodSearchItem[];
  /** Present only when the result is empty. */
  message?: string;
};

export const EMPTY_SEARCH_MESSAGE =
  "MVP対象の食材候補が見つかりません。別名で検索するか、MVP対象一覧を確認してください。";

/**
 * GET /api/foods/{food_id}/nutrients — one food's full nutrient profile per
 * 100g, read straight from the frozen seed (食材の栄養価ビュー). Amounts are the
 * official values; when a cell is non-numeric (Tr / (0) / -) it is preserved
 * verbatim in `amount_label` with `amount_per_100g = null`. `percent_of_reference`
 * is filled only when a profile is set and the nutrient is comparable — it is
 * per 100g and never exaggerated (the UI caps the bar at 100%). Facts only.
 */
export type FoodNutrientEntry = {
  nutrient_code: string;
  nutrient_name: string;
  unit: string;
  /** Numeric official amount per 100g, or null when the cell is non-numeric. */
  amount_per_100g: number | null;
  /** Display string incl. non-numeric notations (e.g. "Tr", "(0)"). */
  amount_label: string;
  /** intake ÷ RDA/AI × 100 per 100g; null unless profile set & comparable. */
  percent_of_reference: number | null;
  /** Which reference the percent is against, for context; null when none. */
  reference_type: string | null;
};

export type FoodMacroEnergy = {
  /** Estimated energy share (%E, Atwater general factors). Rounded to sum ~100. */
  protein_percent: number;
  fat_percent: number;
  carbohydrate_percent: number;
};

export type FoodNutrientsResponse = {
  food_id: string;
  display_name: string;
  official_food_name: string;
  official_food_code: string;
  energy_kcal_per_100g: number | null;
  /** P/F/C energy split; null when the macros are not all numeric. */
  macro_energy: FoodMacroEnergy | null;
  nutrients: readonly FoodNutrientEntry[];
  /** true when a profile was applied so percent_of_reference is populated. */
  profile_applied: boolean;
  notice: string;
  sources: readonly string[];
};
