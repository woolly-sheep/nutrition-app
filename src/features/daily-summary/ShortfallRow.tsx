"use client";

import Link from "next/link";
import { useCallback, useId, useState } from "react";
import { ContributionBreakdown } from "../../components/ContributionBreakdown";
import { formatAmount } from "../../components/RemainingCard";
import { Sparkline } from "../../components/Sparkline";
import type { FoodCandidateItem } from "../../server/api/handlers/getFoodCandidates";
import type {
  AnalysisNutrientItem,
  NutrientContributionResponse,
  NutrientTrendResponse,
} from "../../server/api/schemas/analysis";

/**
 * A "あと少し" shortfall row that expands to show where today's intake of
 * this nutrient came from (dashboard insight ②). The breakdown is fetched
 * lazily on first expand — the home screen stays quiet until asked. The bar +
 * legend come from the shared ContributionBreakdown.
 */

type Props = {
  item: AnalysisNutrientItem;
  nudge: FoodCandidateItem | null;
  date: string;
  /** Show the 28-day trend when expanded — the single top shortfall only. */
  showTrend?: boolean;
};

export function ShortfallRow({ item, nudge, date, showTrend = false }: Props) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [contribution, setContribution] =
    useState<NutrientContributionResponse | null>(null);
  const [trend, setTrend] = useState<NutrientTrendResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "failed">("idle");

  const toggle = useCallback(async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && contribution === null && status !== "loading") {
      setStatus("loading");
      try {
        const requests: Promise<Response>[] = [
          fetch(
            `/api/analysis/contribution?date=${date}&nutrient=${encodeURIComponent(item.nutrient_code)}`,
          ),
        ];
        if (showTrend) {
          requests.push(
            fetch(
              `/api/analysis/trend?date=${date}&nutrient=${encodeURIComponent(item.nutrient_code)}`,
            ),
          );
        }
        const [contribRes, trendRes] = await Promise.all(requests);
        if (!contribRes.ok) {
          setStatus("failed");
          return;
        }
        setContribution((await contribRes.json()) as NutrientContributionResponse);
        if (trendRes?.ok) {
          setTrend((await trendRes.json()) as NutrientTrendResponse);
        }
        setStatus("idle");
      } catch {
        setStatus("failed");
      }
    }
  }, [expanded, contribution, status, date, item.nutrient_code, showTrend]);

  return (
    <div style={{ marginBottom: "10px" }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        style={styles.rowButton}
      >
        <span style={styles.name}>
          {item.nutrient_name}
          <span aria-hidden="true" style={styles.caret}>
            {expanded ? "▼" : "▸"}
          </span>
        </span>
        <span style={styles.track}>
          <span
            style={{
              ...styles.fill,
              width: `${Math.min(item.percent_of_reference ?? 0, 100)}%`,
            }}
          />
        </span>
        <span style={styles.remaining}>
          あと
          <b style={{ color: "var(--color-primary-deep)" }}>
            {formatAmount(item.remaining_amount ?? 0)}
          </b>
          {item.unit}
        </span>
      </button>

      {expanded && (
        <div id={panelId} style={styles.panel}>
          {status === "loading" && (
            <p style={styles.panelNote}>読み込み中…</p>
          )}
          {status === "failed" && (
            <p style={styles.panelNote}>内訳を読み込めませんでした。</p>
          )}
          {contribution &&
            (contribution.foods.length === 0 ? (
              <p style={styles.panelNote}>
                この栄養素を含む記録が見つかりませんでした。
              </p>
            ) : (
              <>
                <p style={styles.panelTitle}>
                  今日の{contribution.nutrient_name}は、どの食事から？（参考・推定）
                </p>
                <ContributionBreakdown
                  foods={contribution.foods}
                  otherPercent={contribution.other_percent}
                  variant="compact"
                />
              </>
            ))}

          {showTrend && trend && trend.recorded_days >= 2 && (
            <div style={styles.trend}>
              <p style={styles.panelTitle}>
                {trend.nutrient_name}の推移（直近{trend.window_days}日・記録日のみ）
              </p>
              <Sparkline points={trend.points} />
              <p style={styles.trendReading}>{trendReading(trend)}</p>
            </div>
          )}
        </div>
      )}

      {nudge && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
          <Link
            href={`/meals?add=${encodeURIComponent(nudge.food_id)}`}
            style={styles.nudge}
            aria-label={`${nudge.display_name}を記録に追加`}
          >
            ＋ {nudge.display_name}{" "}
            {nudge.portion_label ?? `約${Math.round(nudge.portion_g)}g`}
            で基準値の約{Math.round(nudge.percent_of_shortfall)}%
          </Link>
        </div>
      )}
    </div>
  );
}

/** Fact-only, estimate-worded summary of the trend. No 断定, no red. */
function trendReading(trend: NutrientTrendResponse): string {
  const { recorded_days: recorded, days_below_reference: below } = trend;
  if (recorded === 0) {
    return "この期間の記録がまだ少なめです。";
  }
  if (below === recorded) {
    return `この期間の記録日（${recorded}日）はいずれも目安を下回る推定です。少しずつ近づけていきましょう。`;
  }
  if (below >= recorded / 2) {
    return `記録した${recorded}日のうち${below}日で目安をやや下回る傾向です（推定）。`;
  }
  return `記録した${recorded}日の多くは目安前後で推移しています（推定）。`;
}

const styles = {
  rowButton: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    minHeight: "var(--tap-target-min)",
    background: "transparent",
    border: "none",
    padding: "2px 0",
    cursor: "pointer",
    textAlign: "left",
    color: "var(--color-text)",
    font: "inherit",
  },
  name: {
    width: "88px",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  caret: {
    color: "var(--color-subtext)",
    fontSize: "10px",
  },
  track: {
    flex: 1,
    height: "6px",
    background: "var(--color-base)",
    borderRadius: "999px",
    overflow: "hidden",
    boxShadow: "inset 0 0 0 1px rgba(32,42,44,0.06)",
  },
  fill: {
    display: "block",
    height: "100%",
    background: "var(--color-primary)",
    borderRadius: "999px",
  },
  remaining: {
    width: "88px",
    textAlign: "right",
    fontFamily: "var(--font-numeric)",
    fontSize: "14px",
  },
  panel: {
    margin: "8px 0 2px",
    padding: "10px 12px",
    background: "var(--color-base)",
    border: "1px solid var(--color-surface)",
    borderRadius: "12px",
  },
  panelTitle: {
    fontSize: "11px",
    color: "var(--color-subtext)",
    margin: "0 0 7px",
  },
  panelNote: {
    fontSize: "12px",
    color: "var(--color-subtext)",
    margin: 0,
  },
  trend: {
    marginTop: "12px",
    paddingTop: "10px",
    borderTop: "1px solid var(--color-surface)",
  },
  trendReading: {
    fontSize: "12px",
    color: "var(--color-text)",
    margin: "6px 0 0",
    lineHeight: 1.5,
  },
  nudge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "var(--tap-target-min)",
    background: "var(--color-surface)",
    color: "var(--color-primary-deep)",
    borderRadius: "999px",
    padding: "6px 12px",
    fontSize: "12px",
    textDecoration: "none",
  },
} satisfies Record<string, React.CSSProperties>;
