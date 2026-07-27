import { judgeAgainstReference } from "../../../domain/reference/judgeAgainstReference";
import { summarizeDailyIntake } from "../../../domain/analysis/summarizeDailyIntake";
import { formatAmount } from "../../../domain/format/amount";
import { loadSeed, NUTRIENT_META } from "../../../seed/loadSeed";
import { getNutrientsByFoodId } from "../../../seed/seedIndex";
import type { Seed } from "../../../seed/types";
import { readProfile, type StoredProfile } from "../../store/profileStore";
import { resolveProfileForDate } from "../profileResolution";
import { DATA_SOURCES } from "../schemas/analysis";
import type {
  FoodMacroEnergy,
  FoodNutrientEntry,
  FoodNutrientsResponse,
} from "../schemas/foods";

export const FOOD_NUTRIENTS_NOTICE =
  "出典: 日本食品標準成分表(八訂)。100gあたりの成分値で、摂取の推奨ではありません。◯%は区分設定時のみ・推奨量/目安量に対する参考値です。";

/** Atwater general factors — the same intake-side basis used for %E DG. */
const KCAL_PER_G: Record<string, number> = {
  protein_g: 4,
  fat_g: 9,
  carbohydrate_g: 4,
};

type Dependencies = {
  seed?: Seed;
  loadProfile?: () => Promise<StoredProfile | null>;
};

/**
 * One food's full nutrient profile per 100g for the 食材の栄養価 view. Amounts
 * come straight from the frozen seed (non-numeric cells preserved verbatim).
 * When a profile is set, each comparable nutrient also carries its share of the
 * RDA/AI — reusing the daily-analysis judgment so the figure matches the rest
 * of the app. Returns null when the food is unknown (route answers 404). Never
 * log the profile here (logging allowlist).
 */
export async function getFoodNutrients(
  foodId: string,
  date: string,
  { seed = loadSeed(), loadProfile = readProfile }: Dependencies = {},
): Promise<FoodNutrientsResponse | null> {
  const food = seed.foodMaster.find((entry) => entry.food_id === foodId);
  if (!food) {
    return null;
  }

  const rows = getNutrientsByFoodId(seed).get(foodId) ?? [];
  const amountByCode = new Map(rows.map((row) => [row.nutrient_code, row.amount_per_100g]));
  const numericByCode = new Map<string, number>();
  for (const [code, amount] of amountByCode) {
    if (typeof amount === "number") {
      numericByCode.set(code, amount);
    }
  }

  // Percent of the daily reference — only when a profile is set. Reuse the
  // daily-analysis judgment so a food's contribution reads the same everywhere.
  const percentByCode = new Map<string, { percent: number; type: string }>();
  let profileApplied = false;
  const stored = await loadProfile();
  if (stored !== null) {
    const resolved = resolveProfileForDate(stored, date);
    if (resolved.ok) {
      profileApplied = true;
      const judgments = judgeAgainstReference(
        numericByCode,
        resolved.profile,
        seed.nutrientReference,
      );
      for (const entry of summarizeDailyIntake(judgments).comparable) {
        if (typeof entry.percentOfReference === "number") {
          percentByCode.set(entry.judgment.nutrientCode, {
            percent: entry.percentOfReference,
            type: entry.judgment.referenceType,
          });
        }
      }
    }
  }

  const nutrients: FoodNutrientEntry[] = [];
  for (const [code, meta] of Object.entries(NUTRIENT_META)) {
    if (code === "energy_kcal") {
      continue;
    }
    const amount = amountByCode.get(code);
    const numeric = typeof amount === "number" ? amount : null;
    const percent = percentByCode.get(code) ?? null;
    nutrients.push({
      nutrient_code: code,
      nutrient_name: meta.name,
      unit: meta.unit,
      amount_per_100g: numeric,
      amount_label:
        numeric !== null
          ? `${formatAmount(numeric)} ${meta.unit}`
          : amount === null || amount === undefined
            ? "—"
            : String(amount),
      percent_of_reference: percent ? percent.percent : null,
      reference_type: percent ? percent.type : null,
    });
  }

  const energy = amountByCode.get("energy_kcal");

  return {
    food_id: food.food_id,
    display_name: food.display_name,
    official_food_name: food.official_food_name,
    official_food_code: food.official_food_code,
    energy_kcal_per_100g: typeof energy === "number" ? energy : null,
    macro_energy: macroEnergy(numericByCode),
    nutrients,
    profile_applied: profileApplied,
    notice: FOOD_NUTRIENTS_NOTICE,
    sources: DATA_SOURCES,
  };
}

/** P/F/C energy split (%E, Atwater). Null unless all three macros are numeric. */
function macroEnergy(
  numericByCode: ReadonlyMap<string, number>,
): FoodMacroEnergy | null {
  const p = numericByCode.get("protein_g");
  const f = numericByCode.get("fat_g");
  const c = numericByCode.get("carbohydrate_g");
  if (p === undefined || f === undefined || c === undefined) {
    return null;
  }
  const kcalP = p * KCAL_PER_G.protein_g;
  const kcalF = f * KCAL_PER_G.fat_g;
  const kcalC = c * KCAL_PER_G.carbohydrate_g;
  const total = kcalP + kcalF + kcalC;
  if (total <= 0) {
    return null;
  }
  const protein = Math.round((kcalP / total) * 100);
  const fat = Math.round((kcalF / total) * 100);
  // Carbohydrate takes the remainder so the three always sum to exactly 100.
  return {
    protein_percent: protein,
    fat_percent: fat,
    carbohydrate_percent: 100 - protein - fat,
  };
}
