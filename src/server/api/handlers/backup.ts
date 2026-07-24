import { isValidBirthDate } from "../../../domain/reference/ageBand";
import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { listMeals, replaceAllMeals } from "../../store/mealStore";
import {
  readProfile,
  writeProfile,
  type StoredProfile,
} from "../../store/profileStore";
import {
  listSupplements,
  replaceAllSupplements,
} from "../../store/supplementStore";
import {
  listSupplementProducts,
  replaceAllSupplementProducts,
} from "../../store/supplementProductStore";
import type { ProblemDetails } from "../errors/problem";
import { validationProblem } from "../errors/problem";
import { validateItems } from "./createMeal";
import { MEAL_TYPES, type MealRecord, type MealType } from "../schemas/meals";
import {
  SUPPLEMENT_NUTRIENT_CODES,
  type SupplementRecord,
} from "../schemas/supplements";
import type { SupplementProduct } from "../schemas/supplementProducts";

/**
 * Local data backup (本人・ローカル運用の保全). GET exports meals + supplements
 * + product presets + profile as one JSON; POST restores it. Restore fully
 * REPLACES the meals, supplements and products files, so the whole payload is
 * validated before anything is written — an invalid import changes nothing.
 * seed is never touched.
 */

export const BACKUP_VERSION = 1;

const SEXES = new Set(["male", "female"]);
const AGE_BANDS = new Set([
  "adult_18_29",
  "adult_30_49",
  "adult_50_64",
  "adult_65_74",
  "adult_75_plus",
]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type BackupFile = {
  version: number;
  exported_at: string;
  profile: StoredProfile | null;
  meals: readonly MealRecord[];
  supplements: readonly SupplementRecord[];
  supplement_products: readonly SupplementProduct[];
};

export type RestoreResult =
  | { ok: true; restored: number }
  | { ok: false; problem: ProblemDetails };

type Dependencies = {
  seed?: Seed;
  loadMeals?: (date?: string) => Promise<MealRecord[]>;
  loadProfile?: () => Promise<StoredProfile | null>;
  loadSupplements?: (date?: string) => Promise<SupplementRecord[]>;
  loadSupplementProducts?: () => Promise<SupplementProduct[]>;
  saveMeals?: (meals: readonly MealRecord[]) => Promise<void>;
  saveProfile?: (profile: StoredProfile) => Promise<void>;
  saveSupplements?: (supplements: readonly SupplementRecord[]) => Promise<void>;
  saveSupplementProducts?: (
    products: readonly SupplementProduct[],
  ) => Promise<void>;
};

export async function getBackup({
  loadMeals = listMeals,
  loadProfile = readProfile,
  loadSupplements = listSupplements,
  loadSupplementProducts = listSupplementProducts,
}: Dependencies = {}): Promise<BackupFile> {
  return {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    profile: await loadProfile(),
    meals: await loadMeals(),
    supplements: await loadSupplements(),
    supplement_products: await loadSupplementProducts(),
  };
}

export async function restoreBackup(
  body: unknown,
  {
    seed = loadSeed(),
    saveMeals = replaceAllMeals,
    saveProfile = writeProfile,
    saveSupplements = replaceAllSupplements,
    saveSupplementProducts = replaceAllSupplementProducts,
  }: Dependencies = {},
): Promise<RestoreResult> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, problem: validationProblem(["invalid_body"]) };
  }
  const { meals, profile, supplements, supplement_products } = body as Record<
    string,
    unknown
  >;

  if (!Array.isArray(meals)) {
    return { ok: false, problem: validationProblem(["invalid_meals"]) };
  }
  const errors: string[] = [];
  const cleanMeals: MealRecord[] = [];
  for (const [index, raw] of meals.entries()) {
    const result = validateMeal(raw, seed, index);
    if (result.errors.length > 0) {
      errors.push(...result.errors);
    } else if (result.meal) {
      cleanMeals.push(result.meal);
    }
  }

  // Supplements are optional so backups written before this feature still
  // restore (they simply carry no supplements array).
  const cleanSupplements: SupplementRecord[] = [];
  if (supplements !== undefined) {
    if (!Array.isArray(supplements)) {
      errors.push("invalid_supplements");
    } else {
      for (const [index, raw] of supplements.entries()) {
        const result = validateSupplement(raw, index);
        if (result.errors.length > 0) {
          errors.push(...result.errors);
        } else if (result.supplement) {
          cleanSupplements.push(result.supplement);
        }
      }
    }
  }

  // Product presets are optional too (older backups carry none).
  const cleanProducts: SupplementProduct[] = [];
  if (supplement_products !== undefined) {
    if (!Array.isArray(supplement_products)) {
      errors.push("invalid_supplement_products");
    } else {
      for (const [index, raw] of supplement_products.entries()) {
        const result = validateProduct(raw, index);
        if (result.errors.length > 0) {
          errors.push(...result.errors);
        } else if (result.product) {
          cleanProducts.push(result.product);
        }
      }
    }
  }

  let cleanProfile: StoredProfile | null = null;
  if (profile !== null && profile !== undefined) {
    cleanProfile = validateProfile(profile);
    if (cleanProfile === null) {
      errors.push("invalid_profile");
    }
  }

  if (errors.length > 0) {
    return { ok: false, problem: validationProblem(errors) };
  }

  // Validated fully above → safe to replace.
  await saveMeals(cleanMeals);
  await saveSupplements(cleanSupplements);
  await saveSupplementProducts(cleanProducts);
  if (cleanProfile) {
    await saveProfile(cleanProfile);
  }
  return { ok: true, restored: cleanMeals.length };
}

function validateSupplement(
  raw: unknown,
  index: number,
): { errors: string[]; supplement?: SupplementRecord } {
  if (typeof raw !== "object" || raw === null) {
    return { errors: [`supplement_${index}_invalid`] };
  }
  const { supplement_id, date, product_name, amounts, recorded_at } =
    raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof supplement_id !== "string" || supplement_id === "") {
    errors.push(`supplement_${index}_id`);
  }
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    errors.push(`supplement_${index}_date`);
  }
  if (typeof product_name !== "string" || product_name === "") {
    errors.push(`supplement_${index}_name`);
  }
  if (typeof recorded_at !== "string") {
    errors.push(`supplement_${index}_recorded_at`);
  }
  const cleanAmounts: SupplementRecord["amounts"] = [];
  if (!Array.isArray(amounts) || amounts.length === 0) {
    errors.push(`supplement_${index}_amounts`);
  } else {
    for (const [j, entry] of amounts.entries()) {
      if (typeof entry !== "object" || entry === null) {
        errors.push(`supplement_${index}_amount_${j}`);
        continue;
      }
      const { nutrient_code, amount } = entry as Record<string, unknown>;
      if (
        typeof nutrient_code !== "string" ||
        !SUPPLEMENT_NUTRIENT_CODES.has(nutrient_code) ||
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        errors.push(`supplement_${index}_amount_${j}`);
        continue;
      }
      (cleanAmounts as { nutrient_code: string; amount: number }[]).push({
        nutrient_code,
        amount,
      });
    }
  }
  if (errors.length > 0) {
    return { errors };
  }
  return {
    errors: [],
    supplement: {
      supplement_id: supplement_id as string,
      date: date as string,
      product_name: product_name as string,
      amounts: cleanAmounts,
      recorded_at: recorded_at as string,
    },
  };
}

function validateProduct(
  raw: unknown,
  index: number,
): { errors: string[]; product?: SupplementProduct } {
  if (typeof raw !== "object" || raw === null) {
    return { errors: [`product_${index}_invalid`] };
  }
  const { product_id, name, serving_count, serving_unit, amounts, created_at } =
    raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof product_id !== "string" || product_id === "") {
    errors.push(`product_${index}_id`);
  }
  if (typeof name !== "string" || name === "") {
    errors.push(`product_${index}_name`);
  }
  if (
    typeof serving_count !== "number" ||
    !Number.isFinite(serving_count) ||
    serving_count <= 0
  ) {
    errors.push(`product_${index}_serving_count`);
  }
  if (typeof serving_unit !== "string" || serving_unit === "") {
    errors.push(`product_${index}_serving_unit`);
  }
  if (typeof created_at !== "string") {
    errors.push(`product_${index}_created_at`);
  }
  const cleanAmounts: SupplementProduct["amounts"] = [];
  if (!Array.isArray(amounts) || amounts.length === 0) {
    errors.push(`product_${index}_amounts`);
  } else {
    for (const [j, entry] of amounts.entries()) {
      if (typeof entry !== "object" || entry === null) {
        errors.push(`product_${index}_amount_${j}`);
        continue;
      }
      const { nutrient_code, amount } = entry as Record<string, unknown>;
      if (
        typeof nutrient_code !== "string" ||
        !SUPPLEMENT_NUTRIENT_CODES.has(nutrient_code) ||
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        errors.push(`product_${index}_amount_${j}`);
        continue;
      }
      (cleanAmounts as { nutrient_code: string; amount: number }[]).push({
        nutrient_code,
        amount,
      });
    }
  }
  if (errors.length > 0) {
    return { errors };
  }
  return {
    errors: [],
    product: {
      product_id: product_id as string,
      name: name as string,
      serving_count: serving_count as number,
      serving_unit: serving_unit as string,
      amounts: cleanAmounts,
      created_at: created_at as string,
    },
  };
}

function validateMeal(
  raw: unknown,
  seed: Seed,
  index: number,
): { errors: string[]; meal?: MealRecord } {
  if (typeof raw !== "object" || raw === null) {
    return { errors: [`meal_${index}_invalid`] };
  }
  const { date, meal_type, items, meal_id, recorded_at } = raw as Record<
    string,
    unknown
  >;
  const errors: string[] = [];
  if (typeof date !== "string" || !DATE_RE.test(date)) {
    errors.push(`meal_${index}_date`);
  }
  if (!MEAL_TYPES.includes(meal_type as MealType)) {
    errors.push(`meal_${index}_type`);
  }
  if (typeof meal_id !== "string" || meal_id === "") {
    errors.push(`meal_${index}_id`);
  }
  const itemErrors = validateItems(items, seed);
  if (itemErrors.length > 0) {
    errors.push(...itemErrors.map((code) => `meal_${index}_${code}`));
  }
  if (errors.length > 0) {
    return { errors };
  }
  return {
    errors: [],
    meal: {
      date: date as string,
      meal_type: meal_type as MealType,
      meal_id: meal_id as string,
      recorded_at:
        typeof recorded_at === "string" ? recorded_at : new Date().toISOString(),
      items: (items as { food_id: string; intake_g: number }[]).map((item) => ({
        food_id: item.food_id,
        intake_g: item.intake_g,
      })),
    },
  };
}

function validateProfile(raw: unknown): StoredProfile | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const { sex, ageBand, birthDate } = raw as Record<string, unknown>;
  if (typeof sex !== "string" || !SEXES.has(sex)) {
    return null;
  }
  // Accepts both shapes: birth date (current) and the fixed band written
  // by pre-20260724 builds, so older backups still restore.
  if (isValidBirthDate(birthDate)) {
    return { sex, birthDate } as StoredProfile;
  }
  if (typeof ageBand !== "string" || !AGE_BANDS.has(ageBand)) {
    return null;
  }
  return { sex, ageBand } as StoredProfile;
}
