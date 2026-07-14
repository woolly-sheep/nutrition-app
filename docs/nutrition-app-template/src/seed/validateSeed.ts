import { loadSeed } from "./loadSeed";

export type SeedValidationResult = {
  ok: boolean;
  errors: string[];
};

export function validateSeed(): SeedValidationResult {
  const seed = loadSeed();
  const errors: string[] = [];

  if (!Array.isArray(seed.foodMaster)) errors.push("food-master.json must be an array");
  if (!Array.isArray(seed.nutrientAmount)) errors.push("nutrient-amount.json must be an array");
  if (!Array.isArray(seed.nutrientReference)) errors.push("nutrient-reference.json must be an array");

  return {
    ok: errors.length === 0,
    errors,
  };
}
