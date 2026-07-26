/**
 * Status grouping for the 分析タブ・日次 comparison list (issue #57).
 *
 * The screen used to render one flat list of RDA/AI bars, giving every
 * nutrient the same weight. These pure helpers turn the analysis summary
 * into (1) a four-way status tally shown before the detail and (2) ordered
 * groups so the actionable "不足を優先" rows come first.
 *
 * Semantics match the rest of the app (summaryHeadline): 目安圏内 = ≥80% of
 * the reference. No judgement or medical framing — only a factual regrouping
 * of counts the analysis already computed. Facts only, no warning colour.
 */

/** 80% of the reference — the app-wide "目安圏内" boundary (summaryHeadline). */
export const NEAR_THRESHOLD_PERCENT = 80;

export type NutrientBarStatus = "short" | "near" | "achieved";

const GROUP_LABELS: Record<NutrientBarStatus, string> = {
  short: "不足を優先",
  near: "目安圏内",
  achieved: "達成",
};

export type NutrientBarGroup<T> = {
  status: NutrientBarStatus;
  label: string;
  items: readonly T[];
};

type WithPercent = { percent_of_reference?: number };

const percentAsc = (a: WithPercent, b: WithPercent) =>
  (a.percent_of_reference ?? 0) - (b.percent_of_reference ?? 0);

/**
 * Orders the comparison rows as 不足を優先 → 目安圏内 → 達成, with the
 * shortest-of-reference rows first inside the actionable groups. `achieved`
 * is passed through verbatim (already ≥100% by construction); `insufficient`
 * is split at 80%. Empty groups are omitted so the screen renders nothing
 * for a bucket with no rows.
 */
export function buildNutrientBarGroups<T extends WithPercent>(input: {
  achieved: readonly T[];
  insufficient: readonly T[];
}): NutrientBarGroup<T>[] {
  const short: T[] = [];
  const near: T[] = [];
  for (const item of input.insufficient) {
    const bucket =
      (item.percent_of_reference ?? 0) >= NEAR_THRESHOLD_PERCENT ? near : short;
    bucket.push(item);
  }
  short.sort(percentAsc);
  near.sort(percentAsc);

  const groups: NutrientBarGroup<T>[] = [];
  if (short.length > 0) {
    groups.push({ status: "short", label: GROUP_LABELS.short, items: short });
  }
  if (near.length > 0) {
    groups.push({ status: "near", label: GROUP_LABELS.near, items: near });
  }
  if (input.achieved.length > 0) {
    groups.push({
      status: "achieved",
      label: GROUP_LABELS.achieved,
      items: input.achieved,
    });
  }
  return groups;
}

export type StatusTally = {
  /** ≥100% of reference. */
  achieved: number;
  /** 80–100% of reference. */
  near: number;
  /** <80% of reference. */
  short: number;
  /** UL-reached + DG-over rows (surfaces 脂質 etc.). */
  attention: number;
};

/**
 * Four-way tally for the summary header, derived from the counts the server
 * already computed so it stays the single source of truth. `near` and
 * `short` are complementary slices of the comparable set around 80%.
 */
export function buildStatusTally(input: {
  comparableCount: number;
  atLeast80Count: number;
  achievedCount: number;
  ulReachedCount: number;
  dgOverCount: number;
}): StatusTally {
  return {
    achieved: input.achievedCount,
    near: Math.max(0, input.atLeast80Count - input.achievedCount),
    short: Math.max(0, input.comparableCount - input.atLeast80Count),
    attention: input.ulReachedCount + input.dgOverCount,
  };
}
