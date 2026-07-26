"use client";

import { useState } from "react";
import { BulletBar } from "../../components/BulletBar";
import { RangeBar } from "../../components/RangeBar";
import { formatAmount } from "../../components/RemainingCard";
import { SplitBar } from "../../components/SplitBar";
import { ThresholdBar } from "../../components/ThresholdBar";
import type {
  AnalysisExceedanceItem,
  AnalysisNutrientItem,
  FoodUntrackedItem,
  NonFoodLimitItem,
} from "../../server/api/schemas/analysis";
import { ContributionPanel } from "./ContributionPanel";

/**
 * Row renderers for the 分析タブ・日次 (UI design v0.1 §4.3 + v0.2 §3).
 * Presentational only — the screen fetches the analysis and picks which
 * rows to show; each row renders one nutrient's bar/figures. Facts only,
 * no medical framing.
 */

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
  snack: "間食",
};

/** RDA/AI comparison row with a tap-to-open food contribution breakdown. */
export function NutrientBarRow({
  item,
  date,
}: {
  item: AnalysisNutrientItem;
  date: string;
}) {
  const percent = item.percent_of_reference ?? 0;
  const hasSupplement = item.supplement_amount > 0;
  const foodPercent = item.percent_of_reference_food ?? percent;
  const [expanded, setExpanded] = useState(false);
  const panelId = `contrib-${item.nutrient_code}`;
  return (
    <div style={{ marginBottom: "14px" }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        style={styles.rowButton}
      >
        <span style={{ fontSize: "14px", display: "flex", alignItems: "center", gap: "4px" }}>
          {item.nutrient_name}
          <span aria-hidden="true" style={styles.caret}>
            {expanded ? "▼" : "▸"}
          </span>
        </span>
        <span style={styles.rowFigures}>
          {formatAmount(item.intake_amount)} /{" "}
          {typeof item.reference_value === "number"
            ? formatAmount(item.reference_value)
            : item.reference_value}{" "}
          {item.unit}
          {item.remaining_amount !== undefined &&
            item.remaining_amount > 0 &&
            ` · あと${formatAmount(item.remaining_amount)}${item.unit}`}
        </span>
      </button>
      {hasSupplement ? (
        <>
          <SplitBar
            foodPercent={foodPercent}
            totalPercent={percent}
            label={`${item.nutrient_name} 合計${Math.round(percent)}%（食品${Math.round(foodPercent)}%・サプリ${Math.round(percent - foodPercent)}%）`}
          />
          <p style={styles.splitFigures}>
            食品 {formatAmount(item.food_amount)}
            {item.unit} ・ サプリ {formatAmount(item.supplement_amount)}
            {item.unit}
          </p>
        </>
      ) : (
        <BulletBar
          percent={percent}
          label={`${item.nutrient_name} ${Math.round(percent)}%`}
        />
      )}
      {expanded && (
        <div id={panelId}>
          <ContributionPanel
            date={date}
            nutrientCode={item.nutrient_code}
            nutrientName={item.nutrient_name}
          />
        </div>
      )}
    </div>
  );
}

/** UL-reached or DG-over row (7a / 6b). Handles the %E energy-ratio variant. */
export function ExceedanceRow({
  item,
  kind,
}: {
  item: AnalysisExceedanceItem;
  kind: "ul" | "dg";
}) {
  const isEnergyRatio = item.unit === "%E";
  const thresholdLabel =
    kind === "ul"
      ? `UL ${formatAmount(item.threshold_value)}`
      : `目標 ${String(item.reference_value)}/日`;
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={styles.rowHeader}>
        <span style={{ fontSize: "14px" }}>{item.nutrient_name}</span>
        <span style={styles.rowFigures}>
          {formatAmount(item.intake_amount)} / {thresholdLabel} {item.unit}
        </span>
      </div>
      <p
        style={{
          margin: "2px 0 4px",
          fontFamily: "var(--font-numeric)",
          fontSize: "16px",
          fontWeight: 700,
        }}
      >
        {kind === "ul" ? "上限" : isEnergyRatio ? "目標範囲" : "目標"}より +
        {formatAmount(item.over_amount)}
        {isEnergyRatio ? "pt" : item.unit}
      </p>
      {isEnergyRatio && item.range_min !== undefined ? (
        <RangeBar
          value={item.intake_amount}
          rangeMin={item.range_min}
          rangeMax={item.threshold_value}
          label={`${item.nutrient_name} ${Math.round(item.intake_amount)}%E（目標 ${item.range_min}〜${item.threshold_value}%E）`}
        />
      ) : (
        <ThresholdBar
          percentOfThreshold={item.percent_of_threshold}
          label={`${item.nutrient_name} ${kind === "ul" ? "UL" : "目標"}比 ${Math.round(item.percent_of_threshold)}%`}
        />
      )}
      {item.meal_breakdown.length > 0 && (
        <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--color-subtext)" }}>
          内訳の上位:{" "}
          {item.meal_breakdown
            .slice(0, 3)
            .map(
              (entry) =>
                `${MEAL_TYPE_LABELS[entry.meal_type] ?? entry.meal_type} ${formatAmount(entry.amount)}${item.unit}`,
            )
            .join(" · ")}
        </p>
      )}
      <p style={{ margin: "6px 0 0", fontSize: "12px" }}>
        {item.label}。{kind === "ul" && item.note ? item.note : ""}
      </p>
    </div>
  );
}

/** Legend for the food / supplement split bars. */
export function SplitLegend() {
  return (
    <div style={styles.legend}>
      <span style={styles.legendItem}>
        <span style={styles.legendSolid} />
        食品（成分表）
      </span>
      <span style={styles.legendItem}>
        <span style={styles.legendHatch} />
        サプリ（自己申告）
      </span>
    </div>
  );
}

/** Supplement intake for a nutrient whose food side is untracked. */
export function FoodUntrackedRow({ item }: { item: FoodUntrackedItem }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={styles.rowHeader}>
        <span style={{ fontSize: "14px" }}>{item.nutrient_name}</span>
        <span style={styles.rowFigures}>
          サプリ {formatAmount(item.supplement_amount)}
          {item.unit}
          {item.ai !== null && ` / 目安量 ${formatAmount(item.ai)}${item.unit}`}
        </span>
      </div>
      {item.ai !== null && item.percent_of_ai !== null && (
        <BulletBar
          percent={item.percent_of_ai}
          label={`${item.nutrient_name} サプリ分は目安量の ${Math.round(item.percent_of_ai)}%`}
        />
      )}
      <p style={{ margin: "6px 0 0", fontSize: "12px" }}>{item.label}。</p>
    </div>
  );
}

/** Supplement intake against the non-food (通常の食品以外) upper limit. */
export function NonFoodLimitRow({ item }: { item: NonFoodLimitItem }) {
  const percent = item.percent_of_limit;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={styles.rowHeader}>
        <span style={{ fontSize: "14px" }}>{item.nutrient_name}</span>
        <span style={styles.rowFigures}>
          サプリ {formatAmount(item.supplement_amount)}
          {item.unit} / 上限 {formatAmount(item.limit_value)}
          {item.unit}
        </span>
      </div>
      <ThresholdBar
        percentOfThreshold={percent}
        label={`${item.nutrient_name} サプリ分は上限量の ${Math.round(percent)}%`}
      />
      <p style={{ margin: "6px 0 0", fontSize: "12px" }}>{item.label}。</p>
    </div>
  );
}

const styles = {
  splitFigures: {
    margin: "4px 0 0",
    fontSize: "12px",
    color: "var(--color-subtext)",
  },
  legend: {
    display: "flex",
    gap: "16px",
    marginBottom: "12px",
    fontSize: "12px",
    color: "var(--color-subtext)",
  },
  legendItem: { display: "flex", alignItems: "center", gap: "6px" },
  legendSolid: {
    width: "16px",
    height: "10px",
    borderRadius: "2px",
    background: "var(--color-primary)",
    display: "inline-block",
  },
  legendHatch: {
    width: "16px",
    height: "10px",
    borderRadius: "2px",
    display: "inline-block",
    backgroundColor: "rgba(47,140,126,0.18)",
    backgroundImage:
      "repeating-linear-gradient(135deg, var(--color-primary) 0 2px, transparent 2px 5px)",
  },
  rowHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "8px",
    marginBottom: "4px",
  },
  rowButton: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "8px",
    width: "100%",
    minHeight: "var(--tap-target-min)",
    marginBottom: "4px",
    padding: "2px 0",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    color: "var(--color-text)",
    font: "inherit",
  },
  caret: { color: "var(--color-subtext)", fontSize: "10px" },
  rowFigures: { color: "var(--color-subtext)", fontSize: "12px" },
} satisfies Record<string, React.CSSProperties>;
