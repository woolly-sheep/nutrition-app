"use client";

import { useCallback, useId, useState } from "react";
import { formatAmount } from "../../components/RemainingCard";
import type {
  AnalysisExceedanceItem,
  NutrientContributionResponse,
} from "../../server/api/schemas/analysis";

/**
 * A "気をつけたい" over-intake row that expands to show which of the user's
 * foods drove this nutrient over the past year (issue #28 ①). The cause is a
 * habit, so the breakdown aggregates the trailing 365 days (window=year), not
 * a single day. Facts only — no red, no "食べるな" judgment; the segments share
 * the neutral teal breakdown hue used by the shortfall view (1 color = 1
 * meaning). Fetched lazily on first expand.
 */

const SEGMENT_TINTS = ["#2f8c7e", "#6fb7ab", "#a7d6ce"];
const OTHER_TINT = "#e0efec";

type Props = {
  item: AnalysisExceedanceItem;
  /** "ul"=耐容上限量, "dg"=目標量。ラベル文言に使う。 */
  kind: "ul" | "dg";
  date: string;
};

export function OverCauseRow({ item, kind, date }: Props) {
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [contribution, setContribution] =
    useState<NutrientContributionResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "failed">("idle");

  const isEnergyRatio = item.unit === "%E";
  const overLabel =
    kind === "ul" ? "上限" : isEnergyRatio ? "目標範囲" : "目標";

  const toggle = useCallback(async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && contribution === null && status !== "loading") {
      setStatus("loading");
      try {
        const response = await fetch(
          `/api/analysis/contribution?date=${date}&nutrient=${encodeURIComponent(item.nutrient_code)}&window=year`,
        );
        if (!response.ok) {
          setStatus("failed");
          return;
        }
        setContribution(
          (await response.json()) as NutrientContributionResponse,
        );
        setStatus("idle");
      } catch {
        setStatus("failed");
      }
    }
  }, [expanded, contribution, status, date, item.nutrient_code]);

  return (
    <div style={{ marginBottom: "8px" }}>
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
        <span style={styles.over}>
          {overLabel}より +{formatAmount(item.over_amount ?? 0)}
          {isEnergyRatio ? "pt" : item.unit}（推定）
        </span>
      </button>

      {expanded && (
        <div id={panelId} style={styles.panel}>
          {status === "loading" && <p style={styles.panelNote}>読み込み中…</p>}
          {status === "failed" && (
            <p style={styles.panelNote}>内訳を読み込めませんでした。</p>
          )}
          {contribution &&
            (contribution.foods.length === 0 ? (
              <p style={styles.panelNote}>
                過去1年にこの栄養素を含む記録が見つかりませんでした。
              </p>
            ) : (
              <>
                <p style={styles.panelTitle}>
                  過去1年で{contribution.nutrient_name}を多く摂った食材（参考・推定）
                </p>
                <div style={styles.stack}>
                  {contribution.foods.map((food, index) => (
                    <span
                      key={food.food_id}
                      style={{
                        width: `${food.percent}%`,
                        background: SEGMENT_TINTS[index] ?? OTHER_TINT,
                        height: "100%",
                      }}
                    />
                  ))}
                  {contribution.other_percent > 0 && (
                    <span
                      style={{
                        width: `${contribution.other_percent}%`,
                        background: OTHER_TINT,
                        height: "100%",
                      }}
                    />
                  )}
                </div>
                <div style={styles.legend}>
                  {contribution.foods.map((food, index) => (
                    <span key={food.food_id} style={styles.legendItem}>
                      <span
                        style={{
                          ...styles.swatch,
                          background: SEGMENT_TINTS[index] ?? OTHER_TINT,
                        }}
                      />
                      {food.display_name} {Math.round(food.percent)}%
                    </span>
                  ))}
                  {contribution.other_percent > 0 && (
                    <span style={styles.legendItem}>
                      <span
                        style={{ ...styles.swatch, background: OTHER_TINT }}
                      />
                      その他 {Math.round(contribution.other_percent)}%
                    </span>
                  )}
                </div>
                <p style={styles.panelHint}>
                  分量や頻度の多い食材が上位に出ます。摂り方を見直す手がかりにどうぞ。
                </p>
              </>
            ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  rowButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
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
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  caret: { color: "var(--color-subtext)", fontSize: "10px" },
  over: {
    fontSize: "13px",
    color: "var(--color-subtext)",
    textAlign: "right",
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
  panelNote: { fontSize: "12px", color: "var(--color-subtext)", margin: 0 },
  panelHint: {
    fontSize: "11px",
    color: "var(--color-subtext)",
    margin: "8px 0 0",
    lineHeight: 1.5,
  },
  stack: {
    display: "flex",
    height: "12px",
    borderRadius: "999px",
    overflow: "hidden",
    marginBottom: "8px",
    background: "var(--color-surface)",
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px 12px",
    fontSize: "11px",
    color: "var(--color-text)",
  },
  legendItem: { display: "inline-flex", alignItems: "center", gap: "5px" },
  swatch: { width: "8px", height: "8px", borderRadius: "2px" },
} satisfies Record<string, React.CSSProperties>;
