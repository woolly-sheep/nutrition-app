import { formatAmount } from "./RemainingCard";
import type { ContributionFoodItem } from "../server/api/schemas/analysis";

/**
 * Shared food-contribution visual: a single stacked bar (largest share first)
 * plus a legend. Used by the home shortfall / over-cause rows and the analysis
 * breakdown panel — one source for the segment tints and bar so the three stay
 * consistent. Neutral teal segments only (1 color = 1 meaning), no red.
 *
 * variant "compact" = home rows (inline wrapped legend, %-only);
 * variant "detailed" = analysis panel (list legend with amount + %).
 */

const SEGMENT_TINTS = ["#2f8c7e", "#6fb7ab", "#a7d6ce"];
const OTHER_TINT = "#e0efec";

type Props = {
  foods: readonly ContributionFoodItem[];
  otherPercent: number;
  /** Only used by the "detailed" variant (shown next to the percentage). */
  otherAmount?: number;
  unit?: string;
  variant?: "compact" | "detailed";
};

export function ContributionBreakdown({
  foods,
  otherPercent,
  otherAmount = 0,
  unit = "",
  variant = "detailed",
}: Props) {
  const tintFor = (index: number) => SEGMENT_TINTS[index] ?? OTHER_TINT;
  const swatch = variant === "compact" ? styles.swatchSmall : styles.swatchLarge;

  return (
    <>
      <div
        style={{
          ...styles.stack,
          marginBottom: variant === "compact" ? "8px" : "10px",
        }}
      >
        {foods.map((food, index) => (
          <span
            key={food.food_id}
            style={{ width: `${food.percent}%`, background: tintFor(index), height: "100%" }}
          />
        ))}
        {otherPercent > 0 && (
          <span
            style={{ width: `${otherPercent}%`, background: OTHER_TINT, height: "100%" }}
          />
        )}
      </div>

      {variant === "compact" ? (
        <div style={styles.legendInline}>
          {foods.map((food, index) => (
            <span key={food.food_id} style={styles.legendInlineItem}>
              <span style={{ ...swatch, background: tintFor(index) }} />
              {food.display_name} {Math.round(food.percent)}%
            </span>
          ))}
          {otherPercent > 0 && (
            <span style={styles.legendInlineItem}>
              <span style={{ ...swatch, background: OTHER_TINT }} />
              その他 {Math.round(otherPercent)}%
            </span>
          )}
        </div>
      ) : (
        <ul style={styles.legendList}>
          {foods.map((food, index) => (
            <li key={food.food_id} style={styles.legendRow}>
              <span style={{ ...swatch, background: tintFor(index) }} />
              <span style={{ flex: 1 }}>{food.display_name}</span>
              <span style={styles.legendFig}>
                {formatAmount(food.amount)}
                {unit}・{Math.round(food.percent)}%
              </span>
            </li>
          ))}
          {otherPercent > 0 && (
            <li style={styles.legendRow}>
              <span style={{ ...swatch, background: OTHER_TINT }} />
              <span style={{ flex: 1 }}>その他</span>
              <span style={styles.legendFig}>
                {formatAmount(otherAmount)}
                {unit}・{Math.round(otherPercent)}%
              </span>
            </li>
          )}
        </ul>
      )}
    </>
  );
}

const styles = {
  stack: {
    display: "flex",
    height: "12px",
    borderRadius: "999px",
    overflow: "hidden",
    background: "var(--color-surface)",
  },
  legendInline: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px 12px",
    fontSize: "11px",
    color: "var(--color-text)",
  },
  legendInlineItem: { display: "inline-flex", alignItems: "center", gap: "5px" },
  legendList: { listStyle: "none", margin: 0, padding: 0 },
  legendRow: {
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
  swatchSmall: { width: "8px", height: "8px", borderRadius: "2px", flexShrink: 0 },
  swatchLarge: { width: "10px", height: "10px", borderRadius: "3px", flexShrink: 0 },
} satisfies Record<string, React.CSSProperties>;
