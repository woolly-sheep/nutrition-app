import { describe, expect, it } from "vitest";
import { judgeAgainstReference } from "../../../src/domain/reference/judgeAgainstReference";
import type { UserProfile } from "../../../src/domain/reference/types";
import { loadSeed } from "../../../src/seed/loadSeed";
import type { NutrientReferenceRecord } from "../../../src/seed/types";

const PROFILE: UserProfile = { sex: "male", ageBand: "adult_18_29" };

function referenceRecord(
  overrides: Partial<NutrientReferenceRecord>,
): NutrientReferenceRecord {
  return {
    nutrient_reference_id: "ref_test",
    nutrient_code: "calcium_mg",
    nutrient_name: "カルシウム",
    reference_type: "recommended_dietary_allowance",
    value: 800,
    unit: "mg",
    age_band: "adult_18_29",
    sex: "male",
    activity_level: "not_applicable",
    target_population: "general_adult",
    judgment_policy: "low_tendency",
    source_report: "test",
    source_section: "test",
    source_checked_at: "2026-07-14",
    correction_reflected: null,
    review_status: "approved",
    ...overrides,
  };
}

function judgeOne(
  record: NutrientReferenceRecord,
  intake: number,
  profile: UserProfile = PROFILE,
) {
  const judgments = judgeAgainstReference(
    new Map([[record.nutrient_code, intake]]),
    profile,
    [record],
  );
  expect(judgments).toHaveLength(1);
  return judgments[0];
}

describe("judgeAgainstReference", () => {
  it("only judges records matching sex and age_band", () => {
    const records = [
      referenceRecord({ sex: "female" }),
      referenceRecord({ age_band: "adult_50_64" }),
      referenceRecord({ nutrient_reference_id: "ref_match" }),
    ];
    const judgments = judgeAgainstReference(new Map(), PROFILE, records);
    expect(judgments).toHaveLength(1);
  });

  it("excludes EER rows whose activity_level does not match the profile", () => {
    const eer = referenceRecord({
      nutrient_code: "energy_kcal",
      reference_type: "estimated_energy_requirement",
      activity_level: "low",
    });
    expect(judgeAgainstReference(new Map(), PROFILE, [eer])).toHaveLength(0);
    expect(
      judgeAgainstReference(new Map(), { ...PROFILE, activityLevel: "low" }, [
        eer,
      ]),
    ).toHaveLength(1);
  });

  it("judges RDA as below/meets with the boundary counting as meets", () => {
    const rda = referenceRecord({ value: 800 });
    expect(judgeOne(rda, 799.9).status).toBe("below_reference");
    expect(judgeOne(rda, 800).status).toBe("meets_reference");
  });

  it("judges UL as above only when intake exceeds the limit", () => {
    const ul = referenceRecord({
      reference_type: "tolerable_upper_intake_level",
      judgment_policy: "high_caution",
      value: 2500,
    });
    expect(judgeOne(ul, 2500).status).toBe("below_upper_limit");
    expect(judgeOne(ul, 2500.1).status).toBe("above_upper_limit");
  });

  it("returns not_applicable for a not_established UL", () => {
    const ul = referenceRecord({
      reference_type: "tolerable_upper_intake_level",
      value: "not_established",
    });
    expect(judgeOne(ul, 100).status).toBe("not_applicable");
  });

  it("judges DG thresholds (以上 / 未満) with strict bounds", () => {
    const fiber = referenceRecord({
      nutrient_code: "dietary_fiber_g",
      reference_type: "tentative_dietary_goal",
      judgment_policy: "goal_achievement",
      value: "22以上",
      unit: "g",
    });
    expect(judgeOne(fiber, 22).status).toBe("within_goal");
    expect(judgeOne(fiber, 21.9).status).toBe("below_goal");

    const salt = referenceRecord({
      nutrient_code: "salt_equivalent_g",
      reference_type: "tentative_dietary_goal",
      judgment_policy: "high_caution",
      value: "7.5未満",
      unit: "g",
    });
    expect(judgeOne(salt, 7.4).status).toBe("within_goal");
    expect(judgeOne(salt, 7.5).status).toBe("above_goal");
  });

  it("judges energy-ratio DG ranges on the %E share, never on grams (decision-20260717)", () => {
    const fatDg = referenceRecord({
      nutrient_code: "fat_g",
      reference_type: "tentative_dietary_goal",
      judgment_policy: "goal_achievement",
      value: "20-30",
      unit: "g",
    });

    const judgeWithEnergy = (fatG: number, energyKcal: number) =>
      judgeAgainstReference(
        new Map([
          ["fat_g", fatG],
          ["energy_kcal", energyKcal],
        ]),
        PROFILE,
        [fatDg],
      )[0];

    // 73g fat × 9 kcal/g ÷ 2000 kcal = 32.85%E → above the 20–30 range
    const over = judgeWithEnergy(73, 2000);
    expect(over.status).toBe("above_goal");
    expect(over.energyRatioPercent).toBeCloseTo(32.85, 2);
    expect(over.referenceValue).toBe("20-30");
    expect(over.intakeAmount).toBe(73);

    // 55g × 9 ÷ 2000 = 24.75%E → within
    expect(judgeWithEnergy(55, 2000).status).toBe("within_goal");
    // 40g × 9 ÷ 2000 = 18%E → below
    expect(judgeWithEnergy(40, 2000).status).toBe("below_goal");
  });

  it("keeps energy-ratio DGs unknown when energy intake is not computable", () => {
    const fatDg = referenceRecord({
      nutrient_code: "fat_g",
      reference_type: "tentative_dietary_goal",
      judgment_policy: "goal_achievement",
      value: "20-30",
      unit: "g",
    });
    const judgment = judgeOne(fatDg, 60); // no energy_kcal in the intake map
    expect(judgment.status).toBe("unknown");
    expect(judgment.unknownReason).toBe("energy_ratio_range");
    expect(judgment.energyRatioPercent).toBeUndefined();
  });

  it("returns unknown for menstruation-conditional RDA values", () => {
    const iron = referenceRecord({
      nutrient_code: "iron_mg",
      sex: "female",
      value: "6.0 no_menses / 10.0 menses",
    });
    const judgment = judgeOne(iron, 8, {
      sex: "female",
      ageBand: "adult_18_29",
    });
    expect(judgment.status).toBe("unknown");
    expect(judgment.unknownReason).toBe("conditional_value");
  });

  it("treats EAR and EER as reference_only, never judged", () => {
    const ear = referenceRecord({
      reference_type: "estimated_average_requirement",
      judgment_policy: "reference_only",
      value: 650,
    });
    expect(judgeOne(ear, 0).status).toBe("reference_only");
  });

  it("judges the frozen seed for one profile without throwing", () => {
    const seed = loadSeed();
    const judgments = judgeAgainstReference(
      new Map(),
      { sex: "female", ageBand: "adult_18_29" },
      seed.nutrientReference,
    );
    expect(judgments.length).toBeGreaterThan(0);

    const ironUl = judgments.find(
      (j) =>
        j.nutrientCode === "iron_mg" &&
        j.referenceType === "tolerable_upper_intake_level",
    );
    expect(ironUl?.status).toBe("not_applicable");
    expect(ironUl?.referenceValue).toBe("not_established");

    const statuses = new Set(judgments.map((j) => j.status));
    expect(statuses.has("above_upper_limit")).toBe(false);
  });
});
