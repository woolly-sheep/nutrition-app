import type { UserProfile } from "../reference/types";

/**
 * Nutrients that have an official reference (目安量 AI) but whose FOOD intake
 * cannot be computed from the frozen seed, because their composition lives in
 * a source we do not seed (e.g. n-3 fatty acids are in the 脂肪酸成分表, not
 * the 第2章 本表). They can still be recorded as supplements and compared
 * against the AI — but only the supplement share is known, so they are never
 * shown as a food / supplement split (that would falsely imply food = 0)
 * (decision-20260724-supplement-products).
 */
export type FoodUntrackedReference = {
  nutrientCode: string;
  nutrientName: string;
  unit: string;
  /** Adequate intake (目安量) per adult band × sex. */
  ai: Record<string, { male: number; female: number }>;
  source: string;
};

const N3_AI: Record<string, { male: number; female: number }> = {
  adult_18_29: { male: 2.2, female: 1.7 },
  adult_30_49: { male: 2.2, female: 1.7 },
  adult_50_64: { male: 2.3, female: 1.9 },
  adult_65_74: { male: 2.3, female: 2.0 },
  adult_75_plus: { male: 2.3, female: 2.0 },
};

export const FOOD_UNTRACKED_REFERENCES: readonly FoodUntrackedReference[] = [
  {
    nutrientCode: "omega3_g",
    nutrientName: "n-3系脂肪酸",
    unit: "g",
    ai: N3_AI,
    source: "MHLW DRI 2025 脂質 報告書 p.128 n-3系脂肪酸表",
  },
];

export const FOOD_UNTRACKED_CODES: ReadonlySet<string> = new Set(
  FOOD_UNTRACKED_REFERENCES.map((r) => r.nutrientCode),
);

export type FoodUntrackedStatus = {
  nutrientCode: string;
  nutrientName: string;
  unit: string;
  /** Supplement-only intake for this nutrient. */
  supplementAmount: number;
  /** Adequate intake for the profile, or null when the band is unavailable. */
  ai: number | null;
  /** supplement ÷ AI × 100, or null when AI is unavailable. */
  percentOfAi: number | null;
  source: string;
};

/**
 * Evaluates food-untracked nutrients the user actually recorded via a
 * supplement, comparing the supplement amount against the profile's AI. Food
 * intake is out of scope, so this is not a fulfilment figure — it is
 * "supplement intake vs the reference", clearly labelled as such by the UI.
 */
export function evaluateFoodUntracked(
  supplementByCode: ReadonlyMap<string, number>,
  profile: UserProfile,
): FoodUntrackedStatus[] {
  const results: FoodUntrackedStatus[] = [];
  for (const ref of FOOD_UNTRACKED_REFERENCES) {
    const supplementAmount = supplementByCode.get(ref.nutrientCode);
    if (supplementAmount === undefined || supplementAmount <= 0) {
      continue;
    }
    const band = ref.ai[profile.ageBand];
    const ai = band ? band[profile.sex] : null;
    results.push({
      nutrientCode: ref.nutrientCode,
      nutrientName: ref.nutrientName,
      unit: ref.unit,
      supplementAmount,
      ai,
      percentOfAi: ai !== null ? (supplementAmount / ai) * 100 : null,
      source: ref.source,
    });
  }
  return results;
}
