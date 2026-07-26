"use client";

import type { FoodCandidatesResponse } from "../../server/api/handlers/getFoodCandidates";
import type { DraftItem } from "../food-search/FoodSearchBox";

/**
 * 不足を補う候補 shortcut section (UI design v0.3 §2). Tied to today's
 * analysis (recommendation boundary: no analysis context → nothing shown)
 * and always renders the mandatory non-recommendation notice. Facts only.
 */
export function ShortfallCandidatesSection({
  candidates,
  onAdd,
}: {
  candidates: FoodCandidatesResponse | null;
  onAdd: (item: DraftItem) => void;
}) {
  if (
    candidates === null ||
    !candidates.has_analysis ||
    candidates.candidates.length === 0
  ) {
    return null;
  }
  return (
    <section style={{ marginTop: "24px" }}>
      <h2 style={styles.sectionTitle}>不足を補う候補</h2>
      <ul style={styles.shortcutList}>
        {candidates.candidates.map((candidate) => (
          <li
            key={`${candidate.target_nutrient_code}-${candidate.food_id}`}
            style={styles.shortcutRow}
          >
            <span style={{ flex: 1 }}>
              {candidate.display_name}{" "}
              {candidate.portion_label ?? `${candidate.portion_g}g`}
              {candidate.estimated_kcal !== null && (
                <span style={styles.subtext}>
                  {" "}
                  {Math.round(candidate.estimated_kcal)} kcal
                </span>
              )}
              <span style={styles.subtext}>
                {" · "}
                {candidate.target_nutrient_name}不足分の約
                {Math.round(candidate.percent_of_shortfall)}%
              </span>
            </span>
            <button
              type="button"
              onClick={() =>
                onAdd({
                  foodId: candidate.food_id,
                  displayName: candidate.display_name,
                  intakeG: candidate.portion_g,
                  estimatedKcal: candidate.estimated_kcal,
                })
              }
              aria-label={`${candidate.display_name}を追加`}
              style={styles.shortcutAdd}
            >
              ＋追加
            </button>
          </li>
        ))}
      </ul>
      <p style={styles.subtext}>{candidates.notice}</p>
    </section>
  );
}

const styles = {
  sectionTitle: { fontSize: "15px", margin: "0 0 8px" },
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
