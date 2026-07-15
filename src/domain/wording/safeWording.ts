import type { JudgmentStatus, NutrientJudgment } from "../reference/types";

/**
 * SafeWordingService — converts factual judgment statuses into display
 * wording that never reads as medical advice or diagnosis
 * (docs/handoff 08_health_safety_wording_policy v0.1).
 *
 * Rules applied here:
 * - tendency / estimate wording only ("〜傾向", "〜の可能性"), no 断定
 * - no treatment / prevention / effect-guarantee expressions
 * - high-caution states carry the consult-a-professional note
 * - DG overage carries the DG/UL distinction note (UI design v0.1 §6b)
 */

/** Policy §5 — shown on onboarding, analysis result, recommendation. */
export const DISCLAIMER =
  "このアプリの表示は、食品成分表等に基づく推定値です。医療診断、治療、栄養療法の代替ではありません。疾患がある方、治療中の方、妊娠・授乳中の方、体調に不安がある方は、医師または管理栄養士などの専門家に相談してください。";

/** UI design v0.1 §6b — required note next to DG overage sections. */
export const DG_OVERAGE_NOTE =
  "目標量(DG)は生活習慣病予防のための基準で、超過が直ちに問題を意味するものではありません。耐容上限量(UL)が設定された栄養素が上限に達した場合のみ、別途明示します。判断・助言は行いません。";

/** Policy §3 注意 — attached to high-caution wording. */
export const CONSULT_NOTE =
  "参考情報です。必要に応じて専門家に相談してください。";

export type SafeWording = {
  /** Short factual/tendency phrase for the nutrient row. */
  label: string;
  /** Required accompanying note, when the policy demands one. */
  note?: string;
};

const WORDING_BY_STATUS: Record<JudgmentStatus, SafeWording> = {
  below_reference: { label: "目安に対して少なめの可能性があります" },
  meets_reference: { label: "おおむね充足している可能性があります" },
  above_upper_limit: {
    label: "耐容上限量(UL)を上回る推定値です",
    note: CONSULT_NOTE,
  },
  below_upper_limit: { label: "耐容上限量(UL)の範囲内の推定値です" },
  within_goal: { label: "目標量(DG)の範囲内の推定値です" },
  above_goal: {
    label: "目標量(DG)を上回る推定値です",
    note: DG_OVERAGE_NOTE,
  },
  below_goal: { label: "目標量(DG)を下回る推定値です" },
  reference_only: { label: "参考情報です（このアプリでは判定を行いません）" },
  not_applicable: { label: "この区分の基準値は設定されていません" },
  unknown: { label: "この基準値は自動判定の対象外です" },
};

export function wordingForJudgment(judgment: NutrientJudgment): SafeWording {
  return WORDING_BY_STATUS[judgment.status];
}
