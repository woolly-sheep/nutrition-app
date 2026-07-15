import { describe, expect, it } from "vitest";
import type {
  JudgmentStatus,
  NutrientJudgment,
} from "../../src/domain/reference/types";
import {
  CONSULT_NOTE,
  DG_OVERAGE_NOTE,
  DISCLAIMER,
  wordingForJudgment,
} from "../../src/domain/wording/safeWording";

const ALL_STATUSES: readonly JudgmentStatus[] = [
  "below_reference",
  "meets_reference",
  "above_upper_limit",
  "below_upper_limit",
  "within_goal",
  "above_goal",
  "below_goal",
  "reference_only",
  "not_applicable",
  "unknown",
];

/** Policy §4 forbidden wording, plus 断定形 the policy replaces. */
const FORBIDDEN_PHRASES = [
  "欠乏症",
  "治ります",
  "予防できます",
  "必ず摂って",
  "改善します",
  "効きます",
  "不足です",
  "摂りすぎです",
];

function judgmentWithStatus(status: JudgmentStatus): NutrientJudgment {
  return {
    nutrientCode: "calcium_mg",
    nutrientName: "カルシウム",
    referenceType: "recommended_dietary_allowance",
    judgmentPolicy: "low_tendency",
    status,
    referenceValue: 800,
    unit: "mg",
    intakeAmount: 400,
  };
}

describe("safe wording policy compliance", () => {
  it("defines wording for every judgment status", () => {
    for (const status of ALL_STATUSES) {
      const wording = wordingForJudgment(judgmentWithStatus(status));
      expect(wording.label.length).toBeGreaterThan(0);
    }
  });

  it("never uses forbidden or assertive medical wording", () => {
    const texts = [
      DISCLAIMER,
      DG_OVERAGE_NOTE,
      CONSULT_NOTE,
      ...ALL_STATUSES.flatMap((status) => {
        const w = wordingForJudgment(judgmentWithStatus(status));
        return [w.label, w.note ?? ""];
      }),
    ];
    for (const text of texts) {
      for (const phrase of FORBIDDEN_PHRASES) {
        expect(text).not.toContain(phrase);
      }
    }
  });

  it("uses tendency/estimate wording for shortfall, not diagnosis", () => {
    const wording = wordingForJudgment(judgmentWithStatus("below_reference"));
    expect(wording.label).toContain("可能性");
  });

  it("attaches the consult note to upper-limit overage (high caution)", () => {
    const wording = wordingForJudgment(judgmentWithStatus("above_upper_limit"));
    expect(wording.note).toBe(CONSULT_NOTE);
    expect(wording.note).toContain("専門家に相談");
  });

  it("attaches the DG/UL distinction note to DG overage (UI §6b)", () => {
    const wording = wordingForJudgment(judgmentWithStatus("above_goal"));
    expect(wording.note).toBe(DG_OVERAGE_NOTE);
    expect(wording.note).toContain("判断・助言は行いません");
  });

  it("keeps the required disclaimer contents (policy §5)", () => {
    expect(DISCLAIMER).toContain("推定値");
    expect(DISCLAIMER).toContain("医療診断、治療、栄養療法の代替ではありません");
    expect(DISCLAIMER).toContain("専門家に相談");
  });
});
