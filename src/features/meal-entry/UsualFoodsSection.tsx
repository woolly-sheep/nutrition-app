"use client";

import type { UsualFoodsResponse } from "../../server/api/handlers/getUsualFoods";
import type { DraftItem } from "../food-search/FoodSearchBox";
import { chipStyles } from "./shortcutChipStyles";

/**
 * いつものX（最近の記録から）shortcut section (UI design v0.3 §1, #62 chips).
 * Derived from recent records — no persisted favorites. Rendered as a
 * horizontal chip rail so several shortcuts stay one tap away without
 * stretching the tab. Renders nothing when there is no usual list yet.
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
      <h2 style={chipStyles.sectionTitle}>
        いつもの{mealTypeLabel}
        <span style={chipStyles.sectionHint}>（最近の記録から）</span>
      </h2>
      <ul style={chipStyles.rail}>
        {items.map((item) => (
          <li key={item.food_id} style={chipStyles.railItem}>
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
              aria-label={`${item.display_name} ${item.intake_g}gを追加`}
              style={chipStyles.chip}
            >
              <span style={chipStyles.chipName}>
                <span aria-hidden="true" style={chipStyles.chipPlus}>
                  ＋
                </span>
                <span style={chipStyles.chipLabel}>{item.display_name}</span>
              </span>
              <span style={chipStyles.chipMeta}>
                {item.intake_g}g
                {item.estimated_kcal !== null &&
                  ` · ${Math.round(item.estimated_kcal)} kcal`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
