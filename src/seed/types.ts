/**
 * Frozen seed record shapes.
 *
 * Values come from seed/frozen/*.json, mechanically extracted from the
 * approved seed extraction workbook. Official values may be non-numeric
 * on purpose (e.g. "not_established", "13-20", "6.0 no_menses / 10.0 menses")
 * and must be preserved as-is.
 */

export type OfficialValue = number | string | null;

export type FoodMasterRecord = {
  food_id: string;
  display_name: string;
  official_food_code: string;
  official_food_name: string;
  approved_state: string;
  source_status: string;
  review_status: string;
};

export type NutrientAmountRecord = {
  food_id: string;
  display_name: string;
  official_food_code: string;
  official_food_name: string;
  nutrient_code: string;
  nutrient_name: string;
  amount_per_100g: OfficialValue;
  unit: string;
  value_status: string;
  source_table: string;
  source_snapshot_version: string;
  correction_baseline: string;
  source_checked_at: string;
  review_status: string;
  reviewer_note: string | null;
};

export type NutrientReferenceRecord = {
  nutrient_reference_id: string;
  nutrient_code: string;
  nutrient_name: string;
  reference_type: string;
  value: OfficialValue;
  unit: string;
  age_band: string;
  sex: string;
  activity_level: string;
  target_population: string;
  judgment_policy: string;
  source_report: string;
  source_section: string;
  source_checked_at: string;
  correction_reflected: OfficialValue;
  review_status: string;
  /** Official footnote kept verbatim when it changes how the value reads. */
  reviewer_note?: string | null;
};

export type UnitConversionRecord = {
  unit_conversion_id: string;
  food_id: string;
  display_name: string;
  display_unit: string;
  representative_weight_g: OfficialValue;
  confidence_level: string;
  source_note: string;
  source_type: string;
  warning_code: string | null;
  review_status: string;
  reviewer_note: string | null;
};

/**
 * On-disk compact nutrient row: [food_id, nutrient_code, amount, value_status].
 * loadSeed rehydrates these into full NutrientAmountRecord using constant
 * provenance + the nutrient dictionary. Keeps the bundle small at 2,538 foods.
 */
export type CompactNutrientAmount = readonly [
  food_id: string,
  nutrient_code: string,
  amount_per_100g: OfficialValue,
  value_status: string,
];

export type Seed = {
  foodMaster: readonly FoodMasterRecord[];
  nutrientAmount: readonly NutrientAmountRecord[];
  nutrientReference: readonly NutrientReferenceRecord[];
  unitConversion: readonly UnitConversionRecord[];
};

export type SeedManifestFile = {
  name: string;
  sourceSheet: string;
  expectedRows: number;
  checksum: string;
};

export type SeedManifest = {
  version: string;
  status: string;
  source: string;
  extractedAt: string;
  note: string;
  files: readonly SeedManifestFile[];
};
