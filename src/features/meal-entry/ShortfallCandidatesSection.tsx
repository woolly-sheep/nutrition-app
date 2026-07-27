"use client";

import type { FoodCandidatesResponse } from "../../server/api/handlers/getFoodCandidates";
import type { DraftItem } from "../food-search/FoodSearchBox";
import { chipStyles } from "./shortcutChipStyles";

/**
 * 不足を補う候補 shortcut section (UI design v0.3 §2, #62 chips). Tied to
 * today's analysis (recommendation boundary: no analysis context → nothing
 * shown) and always renders the mandatory non-recommendation notice. Facts
 * only. Rendered as a horizontal chip rail, each chip tagged with the target
 * nutrient (例: D・きくらげ) so the reason is legible at a glance.
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
      <h2 style={chipStyles.sectionTitle}>不足を補う候補</h2>
      <ul style={chipStyles.rail}>
        {candidates.candidates.map((candidate) => (
          <li
            key={`${candidate.target_nutrient_code}-${candidate.food_id}`}
            style={chipStyles.railItem}
          >
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
              aria-label={`${candidate.display_name}を追加。${candidate.target_nutrient_name}不足分の約${Math.round(candidate.percent_of_shortfall)}パーセント`}
              style={chipStyles.chip}
            >
              <span style={chipStyles.chipName}>
                <span
                  aria-hidden="true"
                  style={chipStyles.chipTag}
                  title={candidate.target_nutrient_name}
                >
                  {shortNutrientTag(candidate.target_nutrient_name)}
                </span>
                <span style={chipStyles.chipLabel}>
                  {candidate.display_name}
                </span>
              </span>
              <span style={chipStyles.chipMeta}>
                {candidate.portion_label ?? `${candidate.portion_g}g`}
                {" · "}
                {candidate.target_nutrient_name}の約
                {Math.round(candidate.percent_of_shortfall)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p style={styles.notice}>{candidates.notice}</p>
    </section>
  );
}

/**
 * Compact chip tag for the target nutrient: ビタミン系は接頭辞を落として "D" /
 * "B1" に、それ以外はそのまま（"鉄" 等はすでに短い）。表示だけの短縮で、
 * フルネームは aria-label / title に保持する。
 */
function shortNutrientTag(name: string): string {
  const withoutPrefix = name.replace(/^ビタミン/, "");
  return withoutPrefix.length > 0 ? withoutPrefix : name;
}

const styles = {
  notice: {
    color: "var(--color-subtext)",
    fontSize: "13px",
    margin: "8px 0 0",
  },
} satisfies Record<string, React.CSSProperties>;
