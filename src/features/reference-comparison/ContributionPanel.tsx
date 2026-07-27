"use client";

import { useEffect, useState } from "react";
import { ContributionBreakdown } from "../../components/ContributionBreakdown";
import { formatAmount } from "../../components/RemainingCard";
import type { NutrientContributionResponse } from "../../server/api/schemas/analysis";

/**
 * Food breakdown for one nutrient, shown inline when its row is tapped
 * (issue #44). "この日" is the analysed date; "過去1年" aggregates the trailing
 * 365 days (habitual sources). Reuses the contribution API — facts only over
 * the frozen seed. The bar + legend come from the shared ContributionBreakdown.
 * Each row that opens this owns its own instance / fetch.
 */

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
            <ContributionBreakdown
              foods={data.foods}
              otherPercent={data.other_percent}
              otherAmount={data.other_amount}
              unit={data.unit}
              variant="detailed"
            />
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
    borderRadius: "var(--radius-md)",
  },
  windowRow: { display: "flex", gap: "8px", marginBottom: "10px" },
  windowButton: {
    minHeight: "36px",
    flex: 1,
    border: "1px solid var(--color-primary)",
    borderRadius: "var(--radius-sm)",
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
  source: { fontSize: "11px", color: "var(--color-subtext)", margin: "8px 0 0" },
} satisfies Record<string, React.CSSProperties>;
