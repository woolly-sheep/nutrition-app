/**
 * Daily headline — a rule-based one-liner shown above the bloom so the
 * home screen states the day's meaning in words before any figure
 * (dashboard insight ①, decision-20260724-dashboard-insights).
 *
 * Wording stays inside the safe-wording policy: tendency / estimate only
 * ("推定" / "傾向"), never 断定, never medical framing, no warning colour.
 * The caller renders the string as-is — no per-nutrient advice is produced
 * here, only a factual summary of counts the analysis already computed.
 */

export type HeadlineInput = {
  /** RDA/AI nutrients with an exact numeric reference this day. */
  comparableCount: number;
  /** comparable items at or above 80% of their reference. */
  atLeast80Count: number;
  /** Largest-shortfall nutrient name, or null when nothing is short. */
  topShortfallName: string | null;
  /** UL-reached nutrient names (7a). Empty on days with no exceedance. */
  ulReachedNames: readonly string[];
  /** DG-over nutrient names (6b). Empty on days with no overage. */
  dgOverNames: readonly string[];
};

export function buildDailyHeadline(input: HeadlineInput): string {
  if (input.comparableCount === 0) {
    return "記録はありますが、基準と比較できる項目がまだ少なめの推定です。";
  }

  const ratio = input.atLeast80Count / input.comparableCount;
  const tone =
    ratio >= 0.85
      ? "今日はおおむね順調。"
      : ratio >= 0.5
        ? "今日はまずまず。"
        : "今日は目安に届かない項目が多めです。";

  // The count sentence always carries the "推定" qualifier so every
  // headline reads as an estimate, whatever the tone.
  const count = `${input.comparableCount}項目中${input.atLeast80Count}項目が目安圏内の推定です。`;

  const sentences = [`${tone}${count}`];

  if (input.topShortfallName !== null) {
    sentences.push(`${input.topShortfallName}があと少しで届きそうです。`);
  }

  const watch = [...input.ulReachedNames, ...input.dgOverNames];
  if (watch.length > 0) {
    sentences.push(`${watch[0]}は目安を上回る推定です（詳細は下部）。`);
  }

  return sentences.join(" ");
}
