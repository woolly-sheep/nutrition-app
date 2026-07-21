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
