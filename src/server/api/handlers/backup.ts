import { loadSeed } from "../../../seed/loadSeed";
import type { Seed } from "../../../seed/types";
import { listMeals, replaceAllMeals } from "../../store/mealStore";
import {
  readProfile,
  writeProfile,
  type StoredProfile,
} from "../../store/profileStore";
import type { ProblemDetails } from "../errors/problem";
import { validationProblem } from "../errors/problem";
import { validateItems } from "./createMeal";
import { MEAL_TYPES, type MealRecord, type MealType } from "../schemas/meals";

/**
 * Local data backup (本人・ローカル運用の保全). GET exports meals + profile as
 * one JSON; POST restores it. Restore fully REPLACES the meals file, so the
 * whole payload is validated before anything is written — an invalid import
 * changes nothing. seed is never touched.
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
};

export type RestoreResult =
  | { ok: true; restored: number }
  | { ok: false; problem: ProblemDetails };

type Dependencies = {
  seed?: Seed;
  loadMeals?: (date?: string) => Promise<MealRecord[]>;
  loadProfile?: () => Promise<StoredProfile | null>;
  saveMeals?: (meals: readonly MealRecord[]) => Promise<void>;
  saveProfile?: (profile: StoredProfile) => Promise<void>;
};

export async function getBackup({
  loadMeals = listMeals,
  loadProfile = readProfile,
}: Dependencies = {}): Promise<BackupFile> {
  return {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    profile: await loadProfile(),
    meals: await loadMeals(),
  };
}

export async function restoreBackup(
  body: unknown,
  {
    seed = loadSeed(),
    saveMeals = replaceAllMeals,
    saveProfile = writeProfile,
  }: Dependencies = {},
): Promise<RestoreResult> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, problem: validationProblem(["invalid_body"]) };
  }
  const { meals, profile } = body as Record<string, unknown>;

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
  if (cleanProfile) {
    await saveProfile(cleanProfile);
  }
  return { ok: true, restored: cleanMeals.length };
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
  const { sex, ageBand } = raw as Record<string, unknown>;
  if (
    typeof sex !== "string" ||
    typeof ageBand !== "string" ||
    !SEXES.has(sex) ||
    !AGE_BANDS.has(ageBand)
  ) {
    return null;
  }
  return { sex, ageBand } as StoredProfile;
}
