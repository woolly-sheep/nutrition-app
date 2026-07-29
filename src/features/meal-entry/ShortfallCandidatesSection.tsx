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
              aria-label={`${candidate.display_name}を追加。${candidate.target_nutrient_name}${shortfallLabel(candidate.percent_of_shortfall)}`}
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
                {shortfallLabel(candidate.percent_of_shortfall)}
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

/**
 * Shortfall-coverage phrase. percent_of_shortfall = 含有量 ÷ 残り不足分 × 100,
 * so nutrients with tiny requirements (B12 等) yield absurd figures like
 * 10000% for foods that pack the nutrient. Cap the display at 100% ("誇張し
 * ない" — same principle as the bloom / bars) so the chip reads as a helpful
 * fact, not a broken number.
 */
function shortfallLabel(percentOfShortfall: number): string {
  const percent = Math.round(percentOfShortfall);
  return percent >= 100 ? "不足分の100%以上" : `不足分の約${percent}%`;
}

const styles = {
  notice: {
    color: "var(--color-subtext)",
    fontSize: "13px",
    margin: "8px 0 0",
  },
} satisfies Record<string, React.CSSProperties>;
