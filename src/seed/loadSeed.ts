import foodMaster from "../../seed/frozen/food-master.json";
import nutrientAmountCompact from "../../seed/frozen/nutrient-amount.json";
import nutrientReference from "../../seed/frozen/nutrient-reference.json";
import unitConversion from "../../seed/frozen/unit-conversion.json";
import type {
  CompactNutrientAmount,
  FoodMasterRecord,
  NutrientAmountRecord,
  NutrientReferenceRecord,
  Seed,
  UnitConversionRecord,
} from "./types";

/**
 * Read-only access to the frozen seed. The JSON files are the single
 * source of truth; nothing here recalculates or rewrites official values.
 *
 * nutrient-amount.json is stored compact ([food_id, code, amount, status])
 * and rehydrated to full records with constant provenance + the nutrient
 * dictionary below. All provenance is uniform across rows (see manifest),
 * so rehydration reproduces the extracted records exactly.
 */

const NUTRIENT_META: Record<string, { name: string; unit: string }> = {
  energy_kcal: { name: "エネルギー", unit: "kcal" },
  protein_g: { name: "たんぱく質", unit: "g" },
  fat_g: { name: "脂質", unit: "g" },
  carbohydrate_g: { name: "炭水化物", unit: "g" },
  dietary_fiber_g: { name: "食物繊維", unit: "g" },
  salt_equivalent_g: { name: "食塩相当量", unit: "g" },
  potassium_mg: { name: "カリウム", unit: "mg" },
  calcium_mg: { name: "カルシウム", unit: "mg" },
  iron_mg: { name: "鉄", unit: "mg" },
  zinc_mg: { name: "亜鉛", unit: "mg" },
  vitamin_a_ug: { name: "ビタミンA", unit: "ug" },
  vitamin_b1_mg: { name: "ビタミンB1", unit: "mg" },
  vitamin_b2_mg: { name: "ビタミンB2", unit: "mg" },
  vitamin_c_mg: { name: "ビタミンC", unit: "mg" },
  vitamin_d_ug: { name: "ビタミンD", unit: "ug" },
  folate_ug: { name: "葉酸", unit: "ug" },
};

// Uniform provenance for every extracted nutrient row (see seed-manifest.json).
const PROVENANCE = {
  source_table: "MEXT_ch2_excel",
  source_snapshot_version: "MEXT_2023_8th_addendum_ch2",
  correction_baseline: "2026-03-27_errata",
  source_checked_at: "2026-07-07",
  review_status: "value_extracted_official_mext",
} as const;

let cachedNutrientAmount: NutrientAmountRecord[] | null = null;

function rehydrateNutrientAmount(
  master: readonly FoodMasterRecord[],
): NutrientAmountRecord[] {
  if (cachedNutrientAmount) {
    return cachedNutrientAmount;
  }
  const masterById = new Map(master.map((food) => [food.food_id, food]));
  const rows = nutrientAmountCompact as unknown as CompactNutrientAmount[];
  cachedNutrientAmount = rows.map(
    ([food_id, nutrient_code, amount_per_100g, value_status]) => {
      const food = masterById.get(food_id);
      const meta = NUTRIENT_META[nutrient_code];
      return {
        food_id,
        display_name: food?.display_name ?? food_id,
        official_food_code: food?.official_food_code ?? "",
        official_food_name: food?.official_food_name ?? "",
        nutrient_code,
        nutrient_name: meta?.name ?? nutrient_code,
        amount_per_100g,
        unit: meta?.unit ?? "",
        value_status,
        ...PROVENANCE,
        reviewer_note: null,
      };
    },
  );
  return cachedNutrientAmount;
}

export function loadSeed(): Seed {
  const master = foodMaster as FoodMasterRecord[];
  return {
    foodMaster: master,
    nutrientAmount: rehydrateNutrientAmount(master),
    nutrientReference: nutrientReference as NutrientReferenceRecord[],
    unitConversion: unitConversion as UnitConversionRecord[],
  } as const;
}
