"use client";

import { useEffect, useState } from "react";
import { formatAmount } from "../../components/RemainingCard";
import type { NutrientContributionResponse } from "../../server/api/schemas/analysis";

/**
 * Food breakdown for one nutrient, shown inline when its row is tapped
 * (issue #44). "この日" is the analysed date; "過去1年" aggregates the trailing
 * 365 days (habitual sources). Reuses the contribution API — facts only over
 * the frozen seed, neutral teal segments (1 color = 1 meaning), no red, no
 * recommendation. Each row that opens this owns its own instance / fetch.
 */

const SEGMENT_TINTS = ["#2f8c7e", "#6fb7ab", "#a7d6ce"];
const OTHER_TINT = "#e0efec";

type Window = "day" | "year";

type Props = {
  date: string;
  nutrientCode: string;
  nutrientName: string;
};

export function ContributionPanel({ date, nutrientCode, nutrientName }: Props) {
  const [window, setWindow] = useState<Window>("day");
  const [data, setData] = useState<NutrientContributionResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "failed">(
    "loading",
  );

  useEffect(() => {
    let live = true;
    setStatus("loading");
    (async () => {
      try {
        const response = await fetch(
          `/api/analysis/contribution?date=${date}&nutrient=${encodeURIComponent(nutrientCode)}&window=${window}`,
        );
        if (!live) return;
        if (!response.ok) {
          setStatus("failed");
          return;
        }
        setData((await response.json()) as NutrientContributionResponse);
        setStatus("idle");
      } catch {
        if (live) setStatus("failed");
      }
    })();
    return () => {
      live = false;
    };
  }, [date, nutrientCode, window]);

  return (
    <div style={styles.panel}>
      <div role="group" aria-label="期間" style={styles.windowRow}>
        {(
          [
            ["day", "この日"],
            ["year", "過去1年"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setWindow(value)}
            aria-pressed={window === value}
            style={{
              ...styles.windowButton,
              background:
                window === value ? "var(--color-primary)" : "var(--color-base)",
              color:
                window === value ? "var(--color-base)" : "var(--color-subtext)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {status === "loading" && <p style={styles.note}>読み込み中…</p>}
      {status === "failed" && (
        <p style={styles.note}>内訳を読み込めませんでした。</p>
      )}
      {status === "idle" &&
        data &&
        (data.foods.length === 0 ? (
          <p style={styles.note}>
            {window === "year" ? "過去1年に" : "この日に"}
            {nutrientName}を含む記録が見つかりませんでした。
          </p>
        ) : (
          <>
            <p style={styles.panelTitle}>
              {window === "year" ? "過去1年で" : "この日に"}
              {nutrientName}を摂った食材（合計 約{formatAmount(data.total_amount)}
              {data.unit}・参考）
            </p>
            <div style={styles.stack}>
              {data.foods.map((food, index) => (
                <span
                  key={food.food_id}
                  style={{
                    width: `${food.percent}%`,
                    background: SEGMENT_TINTS[index] ?? OTHER_TINT,
                    height: "100%",
                  }}
                />
              ))}
              {data.other_percent > 0 && (
                <span
                  style={{
                    width: `${data.other_percent}%`,
                    background: OTHER_TINT,
                    height: "100%",
                  }}
                />
              )}
            </div>
            <ul style={styles.legend}>
              {data.foods.map((food, index) => (
                <li key={food.food_id} style={styles.legendItem}>
                  <span
                    style={{
                      ...styles.swatch,
                      background: SEGMENT_TINTS[index] ?? OTHER_TINT,
                    }}
                  />
                  <span style={{ flex: 1 }}>{food.display_name}</span>
                  <span style={styles.legendFig}>
                    {formatAmount(food.amount)}
                    {data.unit}・{Math.round(food.percent)}%
                  </span>
                </li>
              ))}
              {data.other_percent > 0 && (
                <li style={styles.legendItem}>
                  <span style={{ ...styles.swatch, background: OTHER_TINT }} />
                  <span style={{ flex: 1 }}>その他</span>
                  <span style={styles.legendFig}>
                    {formatAmount(data.other_amount)}
                    {data.unit}・{Math.round(data.other_percent)}%
                  </span>
                </li>
              )}
            </ul>
            <p style={styles.source}>{data.notice}</p>
          </>
        ))}
    </div>
  );
}

const styles = {
  panel: {
    margin: "2px 0 14px",
    padding: "12px",
    background: "var(--color-base)",
    border: "1px solid var(--color-surface)",
    borderRadius: "12px",
  },
  windowRow: { display: "flex", gap: "8px", marginBottom: "10px" },
  windowButton: {
    minHeight: "36px",
    flex: 1,
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  note: { fontSize: "13px", color: "var(--color-subtext)", margin: 0 },
  panelTitle: {
    fontSize: "12px",
    color: "var(--color-subtext)",
    margin: "0 0 8px",
  },
  stack: {
    display: "flex",
    height: "12px",
    borderRadius: "999px",
    overflow: "hidden",
    marginBottom: "10px",
    background: "var(--color-surface)",
  },
  legend: { listStyle: "none", margin: 0, padding: 0 },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    padding: "3px 0",
  },
  legendFig: {
    color: "var(--color-subtext)",
    fontFamily: "var(--font-numeric)",
    fontSize: "12px",
  },
  swatch: {
    width: "10px",
    height: "10px",
    borderRadius: "3px",
    flexShrink: 0,
  },
  source: { fontSize: "11px", color: "var(--color-subtext)", margin: "8px 0 0" },
} satisfies Record<string, React.CSSProperties>;
