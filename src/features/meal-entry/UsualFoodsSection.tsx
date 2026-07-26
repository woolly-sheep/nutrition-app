"use client";

import type { UsualFoodsResponse } from "../../server/api/handlers/getUsualFoods";
import type { DraftItem } from "../food-search/FoodSearchBox";

/**
 * いつものX（最近の記録から）shortcut section (UI design v0.3 §1).
 * Derived from recent records — no persisted favorites. Renders nothing
 * when there is no usual list yet, so the parent stays declarative.
 */
export function UsualFoodsSection({
  mealTypeLabel,
  items,
  onAdd,
}: {
  mealTypeLabel: string;
  items: UsualFoodsResponse["items"];
  onAdd: (item: DraftItem) => void;
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <section style={{ marginTop: "24px" }}>
      <h2 style={styles.sectionTitle}>
        いつもの{mealTypeLabel}
        <span style={styles.sectionHint}>（最近の記録から）</span>
      </h2>
      <ul style={styles.shortcutList}>
        {items.map((item) => (
          <li key={item.food_id} style={styles.shortcutRow}>
            <span style={{ flex: 1 }}>
              {item.display_name} {item.intake_g}g
              {item.estimated_kcal !== null && (
                <span style={styles.subtext}>
                  {" "}
                  {Math.round(item.estimated_kcal)} kcal
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={() =>
                onAdd({
                  foodId: item.food_id,
                  displayName: item.display_name,
                  intakeG: item.intake_g,
                  estimatedKcal: item.estimated_kcal,
                })
              }
              aria-label={`${item.display_name}を追加`}
              style={styles.shortcutAdd}
            >
              ＋
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

const styles = {
  sectionTitle: { fontSize: "15px", margin: "0 0 8px" },
  sectionHint: {
    fontSize: "12px",
    fontWeight: 400,
    color: "var(--color-subtext)",
  },
  shortcutList: { listStyle: "none", margin: 0, padding: 0 },
  shortcutRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minHeight: "var(--tap-target-min)",
    padding: "4px 0",
    borderBottom: "1px solid var(--color-surface)",
    fontSize: "14px",
  },
  shortcutAdd: {
    minHeight: "var(--tap-target-min)",
    minWidth: "var(--tap-target-min)",
    padding: "0 12px",
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    background: "var(--color-base)",
    color: "var(--color-primary)",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  subtext: { color: "var(--color-subtext)", fontSize: "13px", margin: 0 },
} satisfies Record<string, React.CSSProperties>;
