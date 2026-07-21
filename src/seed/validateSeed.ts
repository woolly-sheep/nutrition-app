import { loadSeed } from "./loadSeed";
import type {
  NutrientAmountRecord,
  NutrientReferenceRecord,
  Seed,
} from "./types";

export type SeedValidationResult = {
  ok: boolean;
  errors: readonly string[];
};

const EXPECTED_ROWS = {
  foodMaster: 2538,
  nutrientAmount: 40608,
  nutrientReference: 330,
  unitConversion: 6,
} as const;

const NUTRIENTS_PER_FOOD = 16;

const ALLOWED_VALUE_STATUS = new Set([
  "official_value",
  "parenthesized_official_value",
  "trace",
  // "-" in the official table: not measured. Kept as null (unknown), never 0.
  "not_measured",
]);

const ALLOWED_REFERENCE_TYPES = new Set([
  "estimated_energy_requirement",
  "estimated_average_requirement",
  "recommended_dietary_allowance",
  "adequate_intake",
  "tentative_dietary_goal",
  "tolerable_upper_intake_level",
]);

function checkRowCounts(seed: Seed): string[] {
  return (Object.keys(EXPECTED_ROWS) as (keyof typeof EXPECTED_ROWS)[])
    .filter((key) => seed[key].length !== EXPECTED_ROWS[key])
    .map(
      (key) =>
        `${key}: expected ${EXPECTED_ROWS[key]} rows, got ${seed[key].length}`,
    );
}

function checkUnique(label: string, ids: readonly (string | null)[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id) {
      errors.push(`${label}: empty id`);
      continue;
    }
    if (seen.has(id)) errors.push(`${label}: duplicate id ${id}`);
    seen.add(id);
  }
  return errors;
}

function checkNutrientAmounts(seed: Seed): string[] {
  const errors: string[] = [];
  const foodIds = new Set(seed.foodMaster.map((f) => f.food_id));
  const perFood = new Map<string, number>();

  for (const row of seed.nutrientAmount) {
    if (!foodIds.has(row.food_id)) {
      errors.push(`nutrientAmount: unknown food_id ${row.food_id}`);
    }
    perFood.set(row.food_id, (perFood.get(row.food_id) ?? 0) + 1);
    errors.push(...checkAmountRow(row));
  }

  for (const foodId of foodIds) {
    const count = perFood.get(foodId) ?? 0;
    if (count !== NUTRIENTS_PER_FOOD) {
      errors.push(
        `nutrientAmount: ${foodId} has ${count} rows, expected ${NUTRIENTS_PER_FOOD}`,
      );
    }
  }
  return errors;
}

function checkAmountRow(row: NutrientAmountRecord): string[] {
  const errors: string[] = [];
  const key = `${row.food_id}/${row.nutrient_code}`;
  if (!ALLOWED_VALUE_STATUS.has(row.value_status)) {
    errors.push(`nutrientAmount: ${key} has unknown value_status ${row.value_status}`);
  }
  if (typeof row.amount_per_100g === "number" && row.amount_per_100g < 0) {
    errors.push(`nutrientAmount: ${key} has negative amount`);
  }
  // Only "not_measured" ("-") may be non-numeric (null); everything else numeric.
  if (row.amount_per_100g === null && row.value_status !== "not_measured") {
    errors.push(`nutrientAmount: ${key} is null but status is ${row.value_status}`);
  }
  if (row.amount_per_100g !== null && typeof row.amount_per_100g !== "number") {
    errors.push(`nutrientAmount: ${key} has non-numeric amount for ${row.value_status}`);
  }
  if (!row.unit) errors.push(`nutrientAmount: ${key} is missing unit`);
  return errors;
}

function checkReferenceRow(row: NutrientReferenceRecord): string[] {
  const errors: string[] = [];
  const key = row.nutrient_reference_id;
  if (!ALLOWED_REFERENCE_TYPES.has(row.reference_type)) {
    errors.push(`nutrientReference: ${key} has unknown reference_type ${row.reference_type}`);
  }
  if (row.value === null || row.value === "") {
    errors.push(`nutrientReference: ${key} is missing value`);
  }
  if (!row.age_band || !row.sex) {
    errors.push(`nutrientReference: ${key} is missing age_band or sex`);
  }
  return errors;
}

/**
 * Preserved official cases that must never be "fixed" by code
 * (handoff: seed freeze review v1.3).
 */
function checkPreservedCases(seed: Seed): string[] {
  const errors: string[] = [];

  const ironUl = seed.nutrientReference.filter(
    (r) =>
      r.nutrient_code === "iron_mg" &&
      r.reference_type === "tolerable_upper_intake_level",
  );
  if (ironUl.some((r) => r.value !== "not_established")) {
    errors.push("preserved: iron UL must stay not_established");
  }

  const ironFemale = seed.nutrientReference.filter(
    (r) =>
      r.nutrient_code === "iron_mg" &&
      r.sex === "female" &&
      r.reference_type === "recommended_dietary_allowance",
  );
  if (!ironFemale.some((r) => String(r.value).includes("menses"))) {
    errors.push("preserved: iron female rows must keep the menstrual-condition split");
  }

  const vitaminA = [
    ...seed.nutrientAmount.filter((r) => r.nutrient_code === "vitamin_a_ug"),
    ...seed.nutrientReference.filter((r) => r.nutrient_code === "vitamin_a_ug"),
  ];
  if (vitaminA.length === 0 || vitaminA.some((r) => r.unit !== "ug")) {
    errors.push("preserved: vitamin A rows must use ug (ugRAE)");
  }

  return errors;
}

function checkUnitConversions(seed: Seed): string[] {
  const foodIds = new Set(seed.foodMaster.map((f) => f.food_id));
  return seed.unitConversion
    .filter((row) => !foodIds.has(row.food_id))
    .map((row) => `unitConversion: unknown food_id ${row.food_id}`);
}

export function validateSeed(): SeedValidationResult {
  const seed = loadSeed();

  const errors = [
    ...checkRowCounts(seed),
    ...checkUnique("foodMaster", seed.foodMaster.map((f) => f.food_id)),
    ...checkUnique(
      "nutrientReference",
      seed.nutrientReference.map((r) => r.nutrient_reference_id),
    ),
    ...checkUnique(
      "unitConversion",
      seed.unitConversion.map((r) => r.unit_conversion_id),
    ),
    ...checkNutrientAmounts(seed),
    ...seed.nutrientReference.flatMap(checkReferenceRow),
    ...checkUnitConversions(seed),
    ...checkPreservedCases(seed),
  ];

  return {
    ok: errors.length === 0,
    errors,
  };
}
