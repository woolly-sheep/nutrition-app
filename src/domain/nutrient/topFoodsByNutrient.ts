import type { Seed } from "../../seed/types";

/**
 * 栄養素から探す (reverse lookup): the foods richest in one nutrient per 100g.
 * Non-numeric official values (null / trace=0) are excluded — only measured
 * positive amounts rank. Results are capped; this is a read-only reference
 * view over the frozen seed (no recommendation).
 */

export type RichFoodItem = {
  food_id: string;
  display_name: string;
  amount_per_100g: number;
  unit: string;
};

/** Selectable nutrients for the finder UI (client-safe: no seed import). */
export const SELECTABLE_NUTRIENTS: { code: string; label: string }[] = [
  { code: "protein_g", label: "たんぱく質" },
  { code: "dietary_fiber_g", label: "食物繊維" },
  { code: "calcium_mg", label: "カルシウム" },
  { code: "iron_mg", label: "鉄" },
  { code: "zinc_mg", label: "亜鉛" },
  { code: "potassium_mg", label: "カリウム" },
  { code: "vitamin_a_ug", label: "ビタミンA" },
  { code: "vitamin_b1_mg", label: "ビタミンB1" },
  { code: "vitamin_b2_mg", label: "ビタミンB2" },
  { code: "vitamin_c_mg", label: "ビタミンC" },
  { code: "vitamin_d_ug", label: "ビタミンD" },
  { code: "folate_ug", label: "葉酸" },
  { code: "magnesium_mg", label: "マグネシウム" },
  { code: "copper_mg", label: "銅" },
  { code: "vitamin_e_mg", label: "ビタミンE" },
  { code: "niacin_mgne", label: "ナイアシン" },
  { code: "vitamin_b6_mg", label: "ビタミンB6" },
  { code: "vitamin_b12_ug", label: "ビタミンB12" },
];

const SELECTABLE_CODES = new Set(SELECTABLE_NUTRIENTS.map((n) => n.code));

export function topFoodsByNutrient(
  seed: Seed,
  nutrientCode: string,
  limit = 30,
): RichFoodItem[] {
  if (!SELECTABLE_CODES.has(nutrientCode)) {
    return [];
  }
  const nameById = new Map(
    seed.foodMaster.map((food) => [food.food_id, food.display_name]),
  );

  const items: RichFoodItem[] = [];
  for (const row of seed.nutrientAmount) {
    if (
      row.nutrient_code === nutrientCode &&
      typeof row.amount_per_100g === "number" &&
      row.amount_per_100g > 0
    ) {
      items.push({
        food_id: row.food_id,
        display_name: nameById.get(row.food_id) ?? row.food_id,
        amount_per_100g: row.amount_per_100g,
        unit: row.unit,
      });
    }
  }

  items.sort((a, b) => b.amount_per_100g - a.amount_per_100g);
  return items.slice(0, limit);
}
