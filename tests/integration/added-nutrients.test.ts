import { describe, expect, it } from "vitest";
import { judgeAgainstReference } from "../../src/domain/reference/judgeAgainstReference";
import { loadSeed } from "../../src/seed/loadSeed";
import type { UserProfile } from "../../src/domain/reference/types";

/**
 * The 6 nutrients added on 2026-07-24 (decision-20260724-six-more-nutrients).
 * Values are pinned against the official tables so a future re-extraction
 * cannot silently change them.
 */

const ADDED = [
  "magnesium_mg",
  "copper_mg",
  "vitamin_e_mg",
  "niacin_mgne",
  "vitamin_b6_mg",
  "vitamin_b12_ug",
] as const;

const seed = loadSeed();
const MALE_30_49: UserProfile = { sex: "male", ageBand: "adult_30_49" };

function reference(code: string, type: string, profile: UserProfile) {
  return seed.nutrientReference.find(
    (row) =>
      row.nutrient_code === code &&
      row.reference_type === type &&
      row.sex === profile.sex &&
      row.age_band === profile.ageBand,
  );
}

describe("added nutrients — official reference values", () => {
  it("carries every added nutrient for all 5 adult bands × 2 sexes", () => {
    for (const code of ADDED) {
      const rows = seed.nutrientReference.filter((r) => r.nutrient_code === code);
      const bands = new Set(rows.map((r) => `${r.age_band}/${r.sex}`));
      expect(bands.size, code).toBe(10);
    }
  });

  it("matches the DRI 2025 tables for 30〜49歳男性", () => {
    // MHLW DRI 2025: magnesium p.284 / copper p.347 / vitamin E p.183 /
    // niacin p.236 / B6 p.237 / B12 p.238.
    expect(reference("magnesium_mg", "recommended_dietary_allowance", MALE_30_49)?.value).toBe(380);
    expect(reference("copper_mg", "recommended_dietary_allowance", MALE_30_49)?.value).toBe(0.9);
    expect(reference("vitamin_e_mg", "adequate_intake", MALE_30_49)?.value).toBe(6.5);
    expect(reference("niacin_mgne", "recommended_dietary_allowance", MALE_30_49)?.value).toBe(16);
    expect(reference("vitamin_b6_mg", "recommended_dietary_allowance", MALE_30_49)?.value).toBe(1.5);
    expect(reference("vitamin_b12_ug", "adequate_intake", MALE_30_49)?.value).toBe(4);
  });

  it("matches the DRI 2025 tables for 30〜49歳女性", () => {
    const female: UserProfile = { sex: "female", ageBand: "adult_30_49" };
    expect(reference("magnesium_mg", "recommended_dietary_allowance", female)?.value).toBe(290);
    expect(reference("copper_mg", "recommended_dietary_allowance", female)?.value).toBe(0.7);
    expect(reference("vitamin_e_mg", "adequate_intake", female)?.value).toBe(6.0);
    expect(reference("niacin_mgne", "recommended_dietary_allowance", female)?.value).toBe(12);
    expect(reference("vitamin_b6_mg", "tolerable_upper_intake_level", female)?.value).toBe(45);
  });

  it("keeps units on the same basis as the official tables", () => {
    const units = Object.fromEntries(
      ADDED.map((code) => [
        code,
        seed.nutrientReference.find((r) => r.nutrient_code === code)?.unit,
      ]),
    );
    expect(units).toEqual({
      magnesium_mg: "mg",
      copper_mg: "mg",
      vitamin_e_mg: "mg",
      // NE, not plain niacin — the DRI is set in mgNE/日.
      niacin_mgne: "mgNE",
      vitamin_b6_mg: "mg",
      vitamin_b12_ug: "ug",
    });
    for (const code of ADDED) {
      const amounts = seed.nutrientAmount.filter((r) => r.nutrient_code === code);
      expect(amounts.length, code).toBe(2538);
      const referenceUnit = seed.nutrientReference.find(
        (r) => r.nutrient_code === code,
      )?.unit;
      const amountUnit = amounts[0]?.unit;
      // mgNE amounts come from the 八訂 NE column; both sides say mgNE.
      expect(amountUnit, code).toBe(referenceUnit);
    }
  });
});

describe("added nutrients — upper limits that must not be compared", () => {
  it("does not judge magnesium against the non-food 350mg limit", () => {
    const row = reference("magnesium_mg", "tolerable_upper_intake_level", MALE_30_49);
    expect(row?.value).toBe("not_established");
    expect(row?.reviewer_note).toContain("350");

    const judgments = judgeAgainstReference(
      new Map([["magnesium_mg", 900]]),
      MALE_30_49,
      seed.nutrientReference,
    );
    const ul = judgments.find(
      (j) =>
        j.nutrientCode === "magnesium_mg" &&
        j.referenceType === "tolerable_upper_intake_level",
    );
    expect(ul?.status).toBe("not_applicable");
  });

  it("does not compare niacin NE intake against the nicotinamide limit", () => {
    const row = reference("niacin_mgne", "tolerable_upper_intake_level", MALE_30_49);
    expect(row?.value).toBe("350 nicotinamide / 85 nicotinic_acid");

    const judgments = judgeAgainstReference(
      new Map([["niacin_mgne", 400]]),
      MALE_30_49,
      seed.nutrientReference,
    );
    const ul = judgments.find(
      (j) =>
        j.nutrientCode === "niacin_mgne" &&
        j.referenceType === "tolerable_upper_intake_level",
    );
    expect(ul?.status).toBe("unknown");
    expect(ul?.unknownReason).toBe("conditional_value");
  });

  it("still judges the limits that are comparable (copper, vitamin E, B6)", () => {
    const judgments = judgeAgainstReference(
      new Map([
        ["copper_mg", 9],
        ["vitamin_e_mg", 900],
        ["vitamin_b6_mg", 70],
      ]),
      MALE_30_49,
      seed.nutrientReference,
    );
    const statuses = judgments
      .filter((j) => j.referenceType === "tolerable_upper_intake_level")
      .filter((j) =>
        ["copper_mg", "vitamin_e_mg", "vitamin_b6_mg"].includes(j.nutrientCode),
      )
      .map((j) => j.status);
    expect(statuses).toEqual([
      "above_upper_limit",
      "above_upper_limit",
      "above_upper_limit",
    ]);
  });
});
