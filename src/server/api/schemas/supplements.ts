import { NUTRIENT_META } from "../../../seed/loadSeed";

/**
 * サプリメント（自己申告）の記録. Supplements are kept entirely separate from
 * meals and the frozen seed: the amounts are what the user reads off a
 * product label, never an official composition value. The analysis layer
 * shows the food-derived and supplement-derived shares side by side and
 * never merges them into a single "official" figure
 * (decision-20260724-supplement-intake).
 */

export type SupplementAmount = {
  nutrient_code: string;
  /** Per-day amount from the product label, in the nutrient's own unit. */
  amount: number;
};

export type SupplementRecord = {
  supplement_id: string;
  date: string;
  /** Product name as entered by the user (self-reported, free text). */
  product_name: string;
  amounts: readonly SupplementAmount[];
  recorded_at: string;
};

export type CreateSupplementRequest = {
  date: string;
  product_name: string;
  amounts: readonly SupplementAmount[];
};

/**
 * Nutrients offerable for supplement entry: seeded nutrients that carry a
 * personal reference. Energy and the %E macros / salt are excluded — they
 * are not things one "supplements".
 */
const SUPPLEMENTABLE: ReadonlySet<string> = new Set([
  "protein_g",
  "dietary_fiber_g",
  "potassium_mg",
  "calcium_mg",
  "iron_mg",
  "zinc_mg",
  "magnesium_mg",
  "copper_mg",
  "vitamin_a_ug",
  "vitamin_b1_mg",
  "vitamin_b2_mg",
  "vitamin_b6_mg",
  "vitamin_b12_ug",
  "vitamin_c_mg",
  "vitamin_d_ug",
  "vitamin_e_mg",
  "vitamin_k_ug",
  "niacin_mgne",
  "folate_ug",
]);

/**
 * Food-untracked nutrients selectable for supplements: they have an official
 * reference but no seed food composition (decision-20260724-supplement-products),
 * so they are not in NUTRIENT_META and are listed explicitly here.
 */
const EXTRA_SUPPLEMENT_NUTRIENTS: readonly {
  code: string;
  name: string;
  unit: string;
}[] = [{ code: "omega3_g", name: "n-3系脂肪酸（オメガ3）", unit: "g" }];

/** Seeded (NUTRIENT_META order) first, then food-untracked extras. */
export const SUPPLEMENT_NUTRIENTS: readonly {
  code: string;
  name: string;
  unit: string;
}[] = [
  ...Object.entries(NUTRIENT_META)
    .filter(([code]) => SUPPLEMENTABLE.has(code))
    .map(([code, meta]) => ({ code, name: meta.name, unit: meta.unit })),
  ...EXTRA_SUPPLEMENT_NUTRIENTS,
];

export const SUPPLEMENT_NUTRIENT_CODES: ReadonlySet<string> = new Set(
  SUPPLEMENT_NUTRIENTS.map((n) => n.code),
);
